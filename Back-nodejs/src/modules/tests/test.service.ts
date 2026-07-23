import { prisma } from '../../config/database.config';
import {
  TestStatus,
  TestCategory,
  TestType,
  SubmissionStatus,
  DifficultyLevel,
} from '@prisma/client';
import type {
  CreateTestDto,
  UpdateTestDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitAnswersDto,
  ListTestsQuery,
} from './test.validators';

// ─── Test CRUD ────────────────────────────────────────────────────────────────

export async function createTest(recruiterId: string, dto: CreateTestDto) {
  return prisma.test.create({
    data: {
      recruiterId,
      title:                dto.title,
      description:          dto.description,
      category:             dto.category,
      type:                 dto.type,
      durationMinutes:      dto.durationMinutes,
      // New config fields
      passingScore:         dto.passingScore,
      difficultyLevel:      dto.difficultyLevel,
      randomizeQuestions:   dto.randomizeQuestions ?? false,
      oneQuestionPerPage:   dto.oneQuestionPerPage ?? false,
      negativeMarking:      dto.negativeMarking ?? false,
      allowRetake:          dto.allowRetake ?? false,
      availableFrom:        dto.availableFrom ? new Date(dto.availableFrom) : null,
      availableUntil:       dto.availableUntil ? new Date(dto.availableUntil) : null,
      showResultsInstantly: dto.showResultsInstantly ?? true,
      antiCheating:         dto.antiCheating ? JSON.stringify(dto.antiCheating) : null,
    },
    include: { questions: true },
  });
}

export async function listRecruiterTests(
  recruiterId: string,
  query: ListTestsQuery
) {
  const { category, type, status, difficultyLevel, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: any = { recruiterId };
  if (category)        where.category        = category;
  if (type)            where.type            = type;
  if (status)          where.status          = status;
  if (difficultyLevel) where.difficultyLevel = difficultyLevel;

  const [tests, total] = await Promise.all([
    prisma.test.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true, submissions: true } } },
    }),
    prisma.test.count({ where }),
  ]);

  return { tests, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function listPublishedTests(query: ListTestsQuery) {
  const { category, type, difficultyLevel, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: any = { status: TestStatus.PUBLISHED };
  if (category)        where.category        = category;
  if (type)            where.type            = type;
  if (difficultyLevel) where.difficultyLevel = difficultyLevel;

  const [tests, total] = await Promise.all([
    prisma.test.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.test.count({ where }),
  ]);

  return { tests, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getTestById(id: string) {
  return prisma.test.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
      recruiter: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function updateTest(
  id: string,
  recruiterId: string,
  dto: UpdateTestDto
) {
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.recruiterId !== recruiterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  if ([TestStatus.ARCHIVED, TestStatus.PUBLISHED].includes(test.status as any))
    throw Object.assign(new Error('Cannot update this test in its current state'), {
      status: 400,
    });

  return prisma.test.update({
    where: { id },
    data: {
      ...(dto.title               !== undefined && { title:                dto.title }),
      ...(dto.description         !== undefined && { description:          dto.description }),
      ...(dto.category            !== undefined && { category:             dto.category }),
      ...(dto.type                !== undefined && { type:                 dto.type }),
      ...(dto.durationMinutes     !== undefined && { durationMinutes:      dto.durationMinutes }),
      ...(dto.passingScore        !== undefined && { passingScore:         dto.passingScore }),
      ...(dto.difficultyLevel     !== undefined && { difficultyLevel:      dto.difficultyLevel }),
      ...(dto.randomizeQuestions  !== undefined && { randomizeQuestions:   dto.randomizeQuestions }),
      ...(dto.oneQuestionPerPage  !== undefined && { oneQuestionPerPage:   dto.oneQuestionPerPage }),
      ...(dto.negativeMarking     !== undefined && { negativeMarking:      dto.negativeMarking }),
      ...(dto.allowRetake         !== undefined && { allowRetake:          dto.allowRetake }),
      ...(dto.availableFrom       !== undefined && { availableFrom:        dto.availableFrom ? new Date(dto.availableFrom) : null }),
      ...(dto.availableUntil      !== undefined && { availableUntil:       dto.availableUntil ? new Date(dto.availableUntil) : null }),
      ...(dto.showResultsInstantly!== undefined && { showResultsInstantly: dto.showResultsInstantly }),
      ...(dto.antiCheating        !== undefined && { antiCheating:         dto.antiCheating ? JSON.stringify(dto.antiCheating) : null }),
    },
    include: { questions: true },
  });
}

// ─── Submit for Admin Review ──────────────────────────────────────────────────

export async function submitForReview(id: string, recruiterId: string) {
  const test = await prisma.test.findUnique({
    where: { id },
    include: { questions: true },
  });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.recruiterId !== recruiterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (![TestStatus.DRAFT, TestStatus.REJECTED].includes(test.status as any))
    throw Object.assign(
      new Error('Only DRAFT or REJECTED tests can be submitted for review'),
      { status: 400 }
    );
  if (test.questions.length === 0)
    throw Object.assign(
      new Error('Cannot submit a test with no questions for review'),
      { status: 400 }
    );

  return prisma.test.update({
    where: { id },
    data: { status: TestStatus.PENDING_REVIEW, rejectionReason: null },
  });
}

export async function archiveTest(id: string, recruiterId: string) {
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.recruiterId !== recruiterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });

  return prisma.test.update({
    where: { id },
    data: { status: TestStatus.ARCHIVED },
  });
}

// ─── Question CRUD ────────────────────────────────────────────────────────────

export async function addQuestion(
  testId: string,
  recruiterId: string,
  dto: CreateQuestionDto
) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.recruiterId !== recruiterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (test.status === TestStatus.ARCHIVED)
    throw Object.assign(new Error('Cannot add questions to an archived test'), {
      status: 400,
    });

  return prisma.question.create({
    data: {
      testId,
      content:      dto.content,
      orderIndex:   dto.orderIndex ?? 0,
      points:       dto.points ?? 1,
      questionType: dto.questionType ?? 'MCQ_SINGLE',
      options:      dto.options ? JSON.stringify(dto.options) : null,
      expectedOutput: dto.expectedOutput ?? null,
      codeLanguage:   dto.codeLanguage ?? null,
      codeStarter:    dto.codeStarter ?? null,
      matchPairs:     dto.matchPairs ? JSON.stringify(dto.matchPairs) : null,
      correctOrder:   dto.correctOrder ? JSON.stringify(dto.correctOrder) : null,
      numericalMin:   dto.numericalMin !== undefined ? dto.numericalMin : null,
      numericalMax:   dto.numericalMax !== undefined ? dto.numericalMax : null,
      tolerance:      dto.tolerance !== undefined ? dto.tolerance : null,
      explanation:    dto.explanation ?? null,
      mediaUrl:       dto.mediaUrl ?? null,
    },
  });
}

export async function updateQuestion(
  testId: string,
  questionId: string,
  recruiterId: string,
  dto: UpdateQuestionDto
) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.recruiterId !== recruiterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });

  const question = await prisma.question.findFirst({
    where: { id: questionId, testId },
  });
  if (!question)
    throw Object.assign(new Error('Question not found'), { status: 404 });

  return prisma.question.update({
    where: { id: questionId },
    data: {
      ...(dto.content       !== undefined && { content:       dto.content }),
      ...(dto.orderIndex    !== undefined && { orderIndex:    dto.orderIndex }),
      ...(dto.points        !== undefined && { points:        dto.points }),
      ...(dto.questionType  !== undefined && { questionType:  dto.questionType }),
      ...(dto.options       !== undefined && { options:       dto.options ? JSON.stringify(dto.options) : null }),
      ...(dto.expectedOutput!== undefined && { expectedOutput: dto.expectedOutput }),
      ...(dto.codeLanguage  !== undefined && { codeLanguage:  dto.codeLanguage }),
      ...(dto.codeStarter   !== undefined && { codeStarter:   dto.codeStarter }),
      ...(dto.matchPairs    !== undefined && { matchPairs:    dto.matchPairs ? JSON.stringify(dto.matchPairs) : null }),
      ...(dto.correctOrder  !== undefined && { correctOrder:  dto.correctOrder ? JSON.stringify(dto.correctOrder) : null }),
      ...(dto.numericalMin  !== undefined && { numericalMin:  dto.numericalMin }),
      ...(dto.numericalMax  !== undefined && { numericalMax:  dto.numericalMax }),
      ...(dto.tolerance     !== undefined && { tolerance:     dto.tolerance }),
      ...(dto.explanation   !== undefined && { explanation:   dto.explanation }),
      ...(dto.mediaUrl      !== undefined && { mediaUrl:      dto.mediaUrl }),
    },
  });
}

export async function deleteQuestion(
  testId: string,
  questionId: string,
  recruiterId: string
) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.recruiterId !== recruiterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });

  const question = await prisma.question.findFirst({
    where: { id: questionId, testId },
  });
  if (!question)
    throw Object.assign(new Error('Question not found'), { status: 404 });

  return prisma.question.delete({ where: { id: questionId } });
}

// ─── Admin — Review Actions ───────────────────────────────────────────────────

export async function listPendingTests(query: ListTestsQuery) {
  const { category, type, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: any = { status: TestStatus.PENDING_REVIEW };
  if (category) where.category = category;
  if (type)     where.type     = type;

  const [tests, total] = await Promise.all([
    prisma.test.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' }, // oldest first
      include: {
        _count: { select: { questions: true } },
        recruiter: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.test.count({ where }),
  ]);

  return { tests, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function approveTest(id: string) {
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.status !== TestStatus.PENDING_REVIEW)
    throw Object.assign(new Error('Test is not pending review'), { status: 400 });

  return prisma.test.update({
    where: { id },
    data: { status: TestStatus.PUBLISHED, rejectionReason: null },
  });
}

export async function rejectTest(id: string, reason: string) {
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.status !== TestStatus.PENDING_REVIEW)
    throw Object.assign(new Error('Test is not pending review'), { status: 400 });

  return prisma.test.update({
    where: { id },
    data: { status: TestStatus.REJECTED, rejectionReason: reason },
  });
}


// ─── Test Subscriptions ───────────────────────────────────────────────────────

export async function subscribeToTest(testId: string, candidateId: string) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.status !== 'PUBLISHED')
    throw Object.assign(new Error('Test is not available for subscription'), { status: 400 });

  const existing = await prisma.testSubscription.findUnique({
    where: { testId_candidateId: { testId, candidateId } },
  });
  if (existing)
    throw Object.assign(new Error('You have already subscribed to this test'), { status: 409 });

  return prisma.testSubscription.create({
    data: { testId, candidateId },
    include: {
      test: { select: { id: true, title: true, category: true } },
    },
  });
}

export async function getMySubscriptions(candidateId: string) {
  return prisma.testSubscription.findMany({
    where: { candidateId },
    include: {
      test: {
        select: {
          id: true, title: true, category: true, type: true,
          durationMinutes: true, difficultyLevel: true,
          _count: { select: { questions: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listPendingSubscriptions() {
  return prisma.testSubscription.findMany({
    where: { status: 'PENDING' },
    include: {
      test: { select: { id: true, title: true, category: true } },
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function approveSubscription(id: string) {
  const sub = await prisma.testSubscription.findUnique({ where: { id } });
  if (!sub) throw Object.assign(new Error('Subscription not found'), { status: 404 });
  if (sub.status !== 'PENDING')
    throw Object.assign(new Error('Subscription is not pending'), { status: 400 });

  return prisma.testSubscription.update({
    where: { id },
    data: { status: 'APPROVED' },
    include: {
      test: { select: { id: true, title: true } },
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function rejectSubscription(id: string) {
  const sub = await prisma.testSubscription.findUnique({ where: { id } });
  if (!sub) throw Object.assign(new Error('Subscription not found'), { status: 404 });
  if (sub.status !== 'PENDING')
    throw Object.assign(new Error('Subscription is not pending'), { status: 400 });

  return prisma.testSubscription.update({
    where: { id },
    data: { status: 'REJECTED' },
    include: {
      test: { select: { id: true, title: true } },
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

// ─── Recruiter — Get Submissions for a Test ───────────────────────────────────

export async function getTestSubmissions(testId: string, requesterId: string, userRole?: string) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (userRole !== 'ADMIN' && test.recruiterId !== requesterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });

  return prisma.testSubmission.findMany({
    where: { testId },
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
      answers: {
        include: {
          question: { select: { id: true, content: true, points: true, questionType: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
