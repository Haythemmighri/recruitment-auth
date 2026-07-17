import { prisma } from '../../config/database.config';
import { SubmissionStatus, QuestionType } from '@prisma/client';
import type { SubmitAnswersDto } from './test.validators';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if a question type can be auto-graded without human review. */
function isAutoGradable(questionType: QuestionType): boolean {
  return [
    QuestionType.MCQ_SINGLE,
    QuestionType.MCQ_MULTI,
    QuestionType.TRUE_FALSE,
    QuestionType.FILL_BLANK,
    QuestionType.NUMERICAL,
    QuestionType.ORDERING,
    QuestionType.MATCHING,
    QuestionType.DRAG_DROP,
  ].includes(questionType);
}

interface GradeResult {
  isCorrect: boolean;
  pointsAwarded: number;
}

/**
 * Core auto-grading logic per question type.
 * Returns { isCorrect, pointsAwarded }.
 */
function autoGrade(
  questionType: QuestionType,
  question: any,
  answer: any,
  negativeMarking: boolean
): GradeResult {
  const maxPts = question.points as number;
  const penalty = negativeMarking ? -Math.ceil(maxPts * 0.25) : 0; // 25% penalty

  switch (questionType) {
    // ── MCQ Single ────────────────────────────────────────────────────────────
    case QuestionType.MCQ_SINGLE: {
      const options: Array<{ value: string; isCorrect: boolean }> = JSON.parse(question.options || '[]');
      const correctValue = options.find((o) => o.isCorrect)?.value;
      const selected: string[] = answer.selectedOptions ? JSON.parse(answer.selectedOptions) : [];
      const isCorrect = selected.length === 1 && selected[0] === correctValue;
      return { isCorrect, pointsAwarded: isCorrect ? maxPts : (selected.length > 0 ? penalty : 0) };
    }

    // ── MCQ Multi ─────────────────────────────────────────────────────────────
    case QuestionType.MCQ_MULTI: {
      const options: Array<{ value: string; isCorrect: boolean }> = JSON.parse(question.options || '[]');
      const correctValues = options.filter((o) => o.isCorrect).map((o) => o.value).sort();
      const selected: string[] = answer.selectedOptions ? JSON.parse(answer.selectedOptions) : [];
      const isCorrect = JSON.stringify(selected.sort()) === JSON.stringify(correctValues);
      return { isCorrect, pointsAwarded: isCorrect ? maxPts : (selected.length > 0 ? penalty : 0) };
    }

    // ── True/False ────────────────────────────────────────────────────────────
    case QuestionType.TRUE_FALSE: {
      const options: Array<{ value: string; isCorrect: boolean }> = JSON.parse(question.options || '[]');
      const correctValue = options.find((o) => o.isCorrect)?.value;
      const selected: string[] = answer.selectedOptions ? JSON.parse(answer.selectedOptions) : [];
      const isCorrect = selected.length === 1 && selected[0] === correctValue;
      return { isCorrect, pointsAwarded: isCorrect ? maxPts : (selected.length > 0 ? penalty : 0) };
    }

    // ── Fill in the Blank ─────────────────────────────────────────────────────
    case QuestionType.FILL_BLANK: {
      const expected = (question.expectedOutput || '').trim().toLowerCase();
      const given    = (answer.answerText || '').trim().toLowerCase();
      const isCorrect = expected.length > 0 && given === expected;
      return { isCorrect, pointsAwarded: isCorrect ? maxPts : 0 };
    }

    // ── Numerical ─────────────────────────────────────────────────────────────
    case QuestionType.NUMERICAL: {
      const value = parseFloat(answer.answerText || '');
      if (isNaN(value)) return { isCorrect: false, pointsAwarded: 0 };

      const min = question.numericalMin !== null ? Number(question.numericalMin) : -Infinity;
      const max = question.numericalMax !== null ? Number(question.numericalMax) : Infinity;
      const tol = question.tolerance !== null ? Number(question.tolerance) : 0;

      const isCorrect = value >= min - tol && value <= max + tol;
      return { isCorrect, pointsAwarded: isCorrect ? maxPts : (negativeMarking ? penalty : 0) };
    }

    // ── Ordering / Sequence ───────────────────────────────────────────────────
    case QuestionType.ORDERING:
    case QuestionType.DRAG_DROP: {
      const correctOrder: string[] = JSON.parse(question.correctOrder || '[]');
      const givenOrder: string[]   = answer.selectedOptions ? JSON.parse(answer.selectedOptions) : [];
      const isCorrect = JSON.stringify(givenOrder) === JSON.stringify(correctOrder);
      return { isCorrect, pointsAwarded: isCorrect ? maxPts : 0 };
    }

    // ── Matching ──────────────────────────────────────────────────────────────
    case QuestionType.MATCHING: {
      // selectedOptions stores JSON of [{left, right}] as the candidate's mapping
      const correctPairs: Array<{ left: string; right: string }> = JSON.parse(question.matchPairs || '[]');
      const givenPairs: Array<{ left: string; right: string }>   = answer.selectedOptions
        ? JSON.parse(answer.selectedOptions)
        : [];
      const normalize = (pairs: typeof correctPairs) =>
        pairs.map((p) => `${p.left}|${p.right}`).sort().join(',');
      const isCorrect = normalize(givenPairs) === normalize(correctPairs);
      return { isCorrect, pointsAwarded: isCorrect ? maxPts : 0 };
    }

    default:
      // Manually graded types
      return { isCorrect: false, pointsAwarded: 0 };
  }
}

// ─── Start Submission ─────────────────────────────────────────────────────────

export async function startSubmission(testId: string, candidateId: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!test)
    throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.status !== 'PUBLISHED')
    throw Object.assign(new Error('Test is not available'), { status: 400 });

  // Availability window check
  const now = new Date();
  if (test.availableFrom && now < test.availableFrom)
    throw Object.assign(new Error('This test has not started yet'), { status: 400 });
  if (test.availableUntil && now > test.availableUntil)
    throw Object.assign(new Error('This test has closed'), { status: 400 });

  // One submission per candidate per test (unless retake allowed)
  const existing = await prisma.testSubmission.findUnique({
    where: { testId_candidateId: { testId, candidateId } },
  });
  if (existing) {
    if (existing.status === 'SUBMITTED' || existing.status === 'GRADED') {
      if (!test.allowRetake)
        throw Object.assign(new Error('You have already completed this test'), { status: 409 });
      // Delete old submission to allow retake
      await prisma.testSubmission.delete({ where: { id: existing.id } });
    } else {
      // Return in-progress submission
      return existing;
    }
  }

  return prisma.testSubmission.create({
    data: { testId, candidateId, startedAt: new Date() },
  });
}

// ─── Get My Submission ────────────────────────────────────────────────────────

export async function getMySubmission(testId: string, candidateId: string) {
  const sub = await prisma.testSubmission.findUnique({
    where: { testId_candidateId: { testId, candidateId } },
    include: {
      answers: {
        include: {
          question: {
            select: {
              id:          true,
              content:     true,
              orderIndex:  true,
              points:      true,
              questionType:true,
              options:     true,
            },
          },
        },
      },
      test: {
        select: {
          id: true, title: true, type: true, durationMinutes: true,
          randomizeQuestions: true, oneQuestionPerPage: true,
          showResultsInstantly: true, antiCheating: true,
        },
      },
    },
  });
  if (!sub)
    throw Object.assign(new Error('No submission found for this test'), { status: 404 });
  return sub;
}

// ─── Submit Answers ───────────────────────────────────────────────────────────

export async function submitAnswers(
  submissionId: string,
  candidateId: string,
  dto: SubmitAnswersDto
) {
  const submission = await prisma.testSubmission.findUnique({
    where: { id: submissionId },
  });
  if (!submission)
    throw Object.assign(new Error('Submission not found'), { status: 404 });
  if (submission.candidateId !== candidateId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (submission.status !== SubmissionStatus.IN_PROGRESS)
    throw Object.assign(new Error('Submission is already finalized'), { status: 400 });

  // Upsert each answer
  for (const ans of dto.answers) {
    await prisma.questionAnswer.upsert({
      where: {
        submissionId_questionId: {
          submissionId: submission.id,
          questionId:   ans.questionId,
        },
      },
      create: {
        submissionId:    submission.id,
        questionId:      ans.questionId,
        answerText:      ans.answerText ?? null,
        selectedOptions: ans.selectedOptions ? JSON.stringify(ans.selectedOptions) : null,
        fileUrl:         (ans as any).fileUrl ?? null,
      },
      update: {
        answerText:      ans.answerText ?? null,
        selectedOptions: ans.selectedOptions ? JSON.stringify(ans.selectedOptions) : null,
        fileUrl:         (ans as any).fileUrl ?? null,
      },
    });
  }

  return prisma.testSubmission.findUnique({
    where: { id: submissionId },
    include: { answers: true },
  });
}

// ─── Finalize & Auto-grade ────────────────────────────────────────────────────

export async function finalizeSubmission(
  submissionId: string,
  candidateId: string
) {
  const submission = await prisma.testSubmission.findUnique({
    where: { id: submissionId },
    include: {
      answers: true,
      test:    { include: { questions: true } },
    },
  });
  if (!submission)
    throw Object.assign(new Error('Submission not found'), { status: 404 });
  if (submission.candidateId !== candidateId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (submission.status !== SubmissionStatus.IN_PROGRESS)
    throw Object.assign(new Error('Submission already finalized'), { status: 400 });

  const questions      = submission.test.questions;
  const negativeMarking = submission.test.negativeMarking;
  const maxScore        = questions.reduce((sum, q) => sum + q.points, 0);

  let autoScore          = 0;
  let hasManualQuestions = false;
  const gradingUpdates: Promise<any>[] = [];

  for (const question of questions) {
    const qType  = question.questionType as QuestionType;
    const answer  = submission.answers.find((a) => a.questionId === question.id);

    if (!isAutoGradable(qType)) {
      hasManualQuestions = true;
      continue;
    }

    if (!answer) continue; // No answer submitted — 0 points

    const { isCorrect, pointsAwarded } = autoGrade(qType, question, answer, negativeMarking);
    autoScore += Math.max(pointsAwarded, 0); // Clamp negative marking at 0 floor

    gradingUpdates.push(
      prisma.questionAnswer.update({
        where: { id: answer.id },
        data:  { isCorrect, pointsAwarded },
      })
    );
  }

  await Promise.all(gradingUpdates);

  const finalScore = hasManualQuestions ? null : autoScore;

  return prisma.testSubmission.update({
    where: { id: submissionId },
    data: {
      status:      hasManualQuestions ? SubmissionStatus.SUBMITTED : SubmissionStatus.GRADED,
      submittedAt: new Date(),
      score:       finalScore,
      maxScore,
    },
    include: {
      answers: {
        include: {
          question: { select: { id: true, content: true, points: true, questionType: true } },
        },
      },
    },
  });
}

// ─── Manual Grading (Recruiter) ───────────────────────────────────────────────

export async function gradeSubmission(
  submissionId: string,
  recruiterId: string,
  score: number,
  feedback?: string
) {
  const submission = await prisma.testSubmission.findUnique({
    where: { id: submissionId },
    include: { test: true },
  });
  if (!submission)
    throw Object.assign(new Error('Submission not found'), { status: 404 });
  if (submission.test.recruiterId !== recruiterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (submission.status === SubmissionStatus.IN_PROGRESS)
    throw Object.assign(new Error('Submission not yet finalized'), { status: 400 });

  return prisma.testSubmission.update({
    where: { id: submissionId },
    data:  { status: SubmissionStatus.GRADED, score },
  });
}

// ─── Grade Individual Answer (Recruiter) ──────────────────────────────────────

export async function gradeAnswer(
  answerId: string,
  recruiterId: string,
  pointsAwarded: number,
  feedback?: string
) {
  const answer = await prisma.questionAnswer.findUnique({
    where: { id: answerId },
    include: { submission: { include: { test: true } } },
  });
  if (!answer)
    throw Object.assign(new Error('Answer not found'), { status: 404 });
  if (answer.submission.test.recruiterId !== recruiterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });

  return prisma.questionAnswer.update({
    where: { id: answerId },
    data:  {
      pointsAwarded,
      recruiterFeedback: feedback ?? null,
      isCorrect: pointsAwarded > 0,
    },
  });
}
