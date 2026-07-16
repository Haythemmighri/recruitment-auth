import { prisma } from '../../config/database.config';
import {
  TestStatus,
  TestCategory,
  TestType,
  SubmissionStatus,
} from '@prisma/client';
import type {
  CreateTestDto,
  UpdateTestDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitAnswersDto,
  ListTestsQuery,
} from './test.validators';

// Test CRUD

export async function createTest(recruiterId: string, dto: CreateTestDto) {
  return prisma.test.create({
    data: {
      recruiterId,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      type: dto.type,
      durationMinutes: dto.durationMinutes,
    },
    include: { questions: true },
  });
}

export async function listRecruiterTests(
  recruiterId: string,
  query: ListTestsQuery
) {
  const { category, type, status, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: any = { recruiterId };
  if (category) where.category = category;
  if (type) where.type = type;
  if (status) where.status = status;

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
  const { category, type, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: any = { status: TestStatus.PUBLISHED };
  if (category) where.category = category;
  if (type) where.type = type;

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
      ...(dto.title && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category && { category: dto.category }),
      ...(dto.type && { type: dto.type }),
      ...(dto.durationMinutes !== undefined && {
        durationMinutes: dto.durationMinutes,
      }),
    },
    include: { questions: true },
  });
}

// --- Submit for Admin Review (Recruiter) -------------------------------------

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

// --- Question CRUD ------------------------------------------------------------

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
      content: dto.content,
      orderIndex: dto.orderIndex ?? 0,
      points: dto.points ?? 1,
      options: dto.options ? JSON.stringify(dto.options) : null,
      expectedOutput: dto.expectedOutput ?? null,
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
      ...(dto.content && { content: dto.content }),
      ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
      ...(dto.points !== undefined && { points: dto.points }),
      ...(dto.options !== undefined && {
        options: dto.options ? JSON.stringify(dto.options) : null,
      }),
      ...(dto.expectedOutput !== undefined && {
        expectedOutput: dto.expectedOutput,
      }),
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

// Admin -- Review Actions

export async function listPendingTests(query: ListTestsQuery) {
  const { category, type, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: any = { status: TestStatus.PENDING_REVIEW };
  if (category) where.category = category;
  if (type) where.type = type;

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

// Recruiter -- Get submissions for a test

export async function getTestSubmissions(testId: string, recruiterId: string) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) throw Object.assign(new Error('Test not found'), { status: 404 });
  if (test.recruiterId !== recruiterId)
    throw Object.assign(new Error('Forbidden'), { status: 403 });

  return prisma.testSubmission.findMany({
    where: { testId },
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
      answers: {
        include: {
          question: { select: { id: true, content: true, points: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
