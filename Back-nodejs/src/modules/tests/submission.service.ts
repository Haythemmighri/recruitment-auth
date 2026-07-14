import { prisma } from '../../config/database.config';
import { SubmissionStatus } from '@prisma/client';
import type { SubmitAnswersDto } from './test.validators';

// ─── Start Submission ─────────────────────────────────────────────────────────

export async function startSubmission(testId: string, candidateId: string) {
  // Check the test exists and is published
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!test)
    throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.status !== 'PUBLISHED')
    throw Object.assign(new Error('Test is not available'), { status: 400 });

  // One submission per candidate per test
  const existing = await prisma.testSubmission.findUnique({
    where: { testId_candidateId: { testId, candidateId } },
  });
  if (existing) {
    if (existing.status === 'SUBMITTED' || existing.status === 'GRADED')
      throw Object.assign(
        new Error('You have already completed this test'),
        { status: 409 }
      );
    // Return the in-progress submission
    return existing;
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
              id: true,
              content: true,
              orderIndex: true,
              points: true,
              options: true,
            },
          },
        },
      },
      test: { select: { id: true, title: true, type: true, durationMinutes: true } },
    },
  });
  if (!sub)
    throw Object.assign(new Error('No submission found for this test'), {
      status: 404,
    });
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
    throw Object.assign(new Error('Submission is already finalized'), {
      status: 400,
    });

  // Upsert each answer
  for (const ans of dto.answers) {
    await prisma.questionAnswer.upsert({
      where: {
        submissionId_questionId: {
          submissionId: submission.id,
          questionId: ans.questionId,
        },
      },
      create: {
        submissionId: submission.id,
        questionId: ans.questionId,
        answerText: ans.answerText ?? null,
        selectedOptions: ans.selectedOptions
          ? JSON.stringify(ans.selectedOptions)
          : null,
      },
      update: {
        answerText: ans.answerText ?? null,
        selectedOptions: ans.selectedOptions
          ? JSON.stringify(ans.selectedOptions)
          : null,
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
      test: { include: { questions: true } },
    },
  });
  if (!submission)
    throw Object.assign(new Error('Submission not found'), { status: 404 });
  if (submission.candidateId !== candidateId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (submission.status !== SubmissionStatus.IN_PROGRESS)
    throw Object.assign(new Error('Submission already finalized'), {
      status: 400,
    });

  const questions = submission.test.questions;
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

  // Auto-grade QCM questions
  let autoScore = 0;
  const gradingUpdates: Promise<any>[] = [];

  for (const question of questions) {
    const answer = submission.answers.find(
      (a) => a.questionId === question.id
    );
    if (!answer) continue;

    if (question.options) {
      // QCM — parse options and check selected values
      const options: Array<{ value: string; isCorrect: boolean }> =
        JSON.parse(question.options);
      const correctValues = options
        .filter((o) => o.isCorrect)
        .map((o) => o.value)
        .sort();

      const selectedValues: string[] = answer.selectedOptions
        ? JSON.parse(answer.selectedOptions)
        : [];
      const isCorrect =
        JSON.stringify(selectedValues.sort()) ===
        JSON.stringify(correctValues);

      const pointsAwarded = isCorrect ? question.points : 0;
      autoScore += pointsAwarded;

      gradingUpdates.push(
        prisma.questionAnswer.update({
          where: { id: answer.id },
          data: {
            isCorrect,
            pointsAwarded,
          },
        })
      );
    }
  }

  await Promise.all(gradingUpdates);

  // Only set score automatically if ALL questions are QCM (or test has no manual questions)
  const hasManualQuestions = questions.some((q) => !q.options);
  const finalScore = hasManualQuestions ? null : autoScore;

  return prisma.testSubmission.update({
    where: { id: submissionId },
    data: {
      status: hasManualQuestions
        ? SubmissionStatus.SUBMITTED
        : SubmissionStatus.GRADED,
      submittedAt: new Date(),
      score: finalScore,
      maxScore,
    },
    include: {
      answers: {
        include: { question: { select: { id: true, content: true, points: true } } },
      },
    },
  });
}

// ─── Manual Grading (Recruiter) ───────────────────────────────────────────────

export async function gradeSubmission(
  submissionId: string,
  recruiterId: string,
  score: number
) {
  // Validate recruiter owns the test
  const submission = await prisma.testSubmission.findUnique({
    where: { id: submissionId },
    include: { test: true },
  });
  if (!submission)
    throw Object.assign(new Error('Submission not found'), { status: 404 });
  if (submission.test.recruiterId !== recruiterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (submission.status === SubmissionStatus.IN_PROGRESS)
    throw Object.assign(new Error('Submission not yet finalized'), {
      status: 400,
    });

  return prisma.testSubmission.update({
    where: { id: submissionId },
    data: { status: SubmissionStatus.GRADED, score },
  });
}
