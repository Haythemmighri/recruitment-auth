import { z } from 'zod';
import { TestCategory, TestType, SubmissionStatus } from '@prisma/client';

// ─── Test ─────────────────────────────────────────────────────────────────────

export const createTestSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(5000).optional(),
  category: z.nativeEnum(TestCategory),
  type: z.nativeEnum(TestType),
  durationMinutes: z.number().int().positive().optional(),
});

export const updateTestSchema = createTestSchema.partial();

// ─── Question ─────────────────────────────────────────────────────────────────

const qcmOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  isCorrect: z.boolean(),
});

export const createQuestionSchema = z.object({
  content: z.string().min(1),
  orderIndex: z.number().int().min(0).default(0),
  points: z.number().int().positive().default(1),
  // For QCM: array of options with at least one correct answer
  options: z.array(qcmOptionSchema).min(2).optional(),
  // For PROBLEM_SOLVING: expected output
  expectedOutput: z.string().optional(),
});

export const updateQuestionSchema = createQuestionSchema.partial();

// ─── Submission ───────────────────────────────────────────────────────────────

const answerItemSchema = z.object({
  questionId: z.string().cuid(),
  answerText: z.string().optional(),
  selectedOptions: z.array(z.string()).optional(),
});

export const submitAnswersSchema = z.object({
  answers: z.array(answerItemSchema).min(1),
});

export const gradeSubmissionSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().max(2000).optional(),
});

// ─── Filters ──────────────────────────────────────────────────────────────────

export const listTestsQuerySchema = z.object({
  category: z.nativeEnum(TestCategory).optional(),
  type: z.nativeEnum(TestType).optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateTestDto = z.infer<typeof createTestSchema>;
export type UpdateTestDto = z.infer<typeof updateTestSchema>;
export type CreateQuestionDto = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionDto = z.infer<typeof updateQuestionSchema>;
export type SubmitAnswersDto = z.infer<typeof submitAnswersSchema>;
export type ListTestsQuery = z.infer<typeof listTestsQuerySchema>;
