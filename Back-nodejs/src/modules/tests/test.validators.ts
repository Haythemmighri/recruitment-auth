import { z } from 'zod';
import { TestCategory, TestType, QuestionType, DifficultyLevel } from '@prisma/client';

// --- Test Validators ----------------------------------------------------------

const antiCheatingSchema = z.object({
  browserLock:       z.boolean().default(false),
  webcam:            z.boolean().default(false),
  tabSwitchDetection:z.boolean().default(false),
}).optional();

export const createTestSchema = z.object({
  title:               z.string().min(3).max(255),
  description:         z.string().max(5000).optional(),
  category:            z.nativeEnum(TestCategory),
  type:                z.nativeEnum(TestType),
  durationMinutes:     z.number().int().positive().optional(),
  // -- New config fields ---------------------------------------------------
  passingScore:        z.number().int().min(0).max(100).optional(),
  difficultyLevel:     z.nativeEnum(DifficultyLevel).optional(),
  randomizeQuestions:  z.boolean().default(false),
  oneQuestionPerPage:  z.boolean().default(false),
  negativeMarking:     z.boolean().default(false),
  allowRetake:         z.boolean().default(false),
  availableFrom:       z.string().datetime().optional(),
  availableUntil:      z.string().datetime().optional(),
  showResultsInstantly:z.boolean().default(true),
  antiCheating:        antiCheatingSchema,
});

export const updateTestSchema = createTestSchema.partial();

// --- Question Validators ------------------------------------------------------

const qcmOptionSchema = z.object({
  label:     z.string().min(1),
  value:     z.string().min(1),
  isCorrect: z.boolean(),
});

const matchPairSchema = z.object({
  left:  z.string().min(1),
  right: z.string().min(1),
});

export const createQuestionSchema = z.object({
  content:      z.string().min(1),
  orderIndex:   z.number().int().min(0).default(0),
  points:       z.number().int().positive().default(1),
  questionType: z.nativeEnum(QuestionType).default(QuestionType.MCQ_SINGLE),

  // MCQ_SINGLE | MCQ_MULTI | TRUE_FALSE: options array
  options:      z.array(qcmOptionSchema).min(2).optional(),

  // CODE_EDITOR
  expectedOutput: z.string().optional(),
  codeLanguage:   z.string().max(50).optional(),
  codeStarter:    z.string().optional(),

  // MATCHING
  matchPairs:   z.array(matchPairSchema).min(2).optional(),

  // ORDERING: correct ordered list of strings
  correctOrder: z.array(z.string().min(1)).min(2).optional(),

  // NUMERICAL
  numericalMin: z.number().optional(),
  numericalMax: z.number().optional(),
  tolerance:    z.number().min(0).optional(),

  // FILL_BLANK: treated as expectedOutput (case-insensitive match)
  // SHORT_TEXT / LONG_ESSAY: expected answer stored in expectedOutput as model answer

  // Shared optional enrichment
  explanation:  z.string().optional(),
  mediaUrl:     z.string().url().optional(),
});

export const updateQuestionSchema = createQuestionSchema.partial();

// --- Submission Validators ----------------------------------------------------

const answerItemSchema = z.object({
  questionId:      z.string().min(1),  // Accept any non-empty string ID
  answerText:      z.string().optional().nullable(),
  selectedOptions: z.array(z.any()).optional().nullable(), // Accept any values (strings or objects)
  fileUrl:         z.string().optional().nullable(),
});

export const submitAnswersSchema = z.object({
  answers: z.array(answerItemSchema).min(0), // Allow empty array (e.g. time-expired auto-submit)
});

export const gradeSubmissionSchema = z.object({
  score:    z.number().min(0),
  feedback: z.string().max(2000).optional(),
});

// --- Filters ------------------------------------------------------------------

export const listTestsQuerySchema = z.object({
  category:        z.nativeEnum(TestCategory).optional(),
  type:            z.nativeEnum(TestType).optional(),
  difficultyLevel: z.nativeEnum(DifficultyLevel).optional(),
  status:          z.string().optional(),
  page:            z.coerce.number().int().positive().default(1),
  limit:           z.coerce.number().int().positive().max(100).default(20),
});

// --- Exported Types -----------------------------------------------------------

export type CreateTestDto     = z.infer<typeof createTestSchema>;
export type UpdateTestDto     = z.infer<typeof updateTestSchema>;
export type CreateQuestionDto = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionDto = z.infer<typeof updateQuestionSchema>;
export type SubmitAnswersDto  = z.infer<typeof submitAnswersSchema>;
export type ListTestsQuery    = z.infer<typeof listTestsQuerySchema>;
