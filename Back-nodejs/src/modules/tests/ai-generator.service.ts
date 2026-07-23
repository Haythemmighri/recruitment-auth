import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../config/database.config';
import { TestCategory, TestType, DifficultyLevel, QuestionType, TestStatus } from '@prisma/client';
import { z } from 'zod';

export const GenerateAITestInputSchema = z.object({
  topic: z.string().min(2, 'Topic must be at least 2 characters'),
  category: z.nativeEnum(TestCategory).default(TestCategory.CODING_PROGRAMMING),
  type: z.nativeEnum(TestType).default(TestType.QCM),
  difficultyLevel: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
  numQuestions: z.number().int().min(1).max(20).default(5),
  durationMinutes: z.number().int().min(5).max(180).optional(),
  customInstructions: z.string().optional(),
  saveImmediately: z.boolean().default(true),
});

export type GenerateAITestInput = z.infer<typeof GenerateAITestInputSchema>;

export interface GeneratedQuestionItem {
  content: string;
  points: number;
  questionType: QuestionType;
  options?: Array<{ label: string; value: string; isCorrect: boolean }>;
  explanation?: string;
  codeLanguage?: string;
  codeStarter?: string;
  expectedOutput?: string;
}

export interface GeneratedTestStructure {
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  questions: GeneratedQuestionItem[];
}

/**
 * Service to generate tests using Gemini AI with fallback mock generation if API key is missing.
 */
export async function generateTestWithAI(recruiterId: string, input: GenerateAITestInput) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let generatedData: GeneratedTestStructure;

  if (apiKey) {
    generatedData = await generateWithGemini(apiKey, input);
  } else {
    // Graceful fallback when API key is not configured yet
    generatedData = generateMockTest(input);
  }

  if (!input.saveImmediately) {
    return {
      preview: true,
      data: generatedData,
      category: input.category,
      type: input.type,
      difficultyLevel: input.difficultyLevel,
    };
  }

  // Create Test and Questions in database
  const createdTest = await prisma.$transaction(async (tx) => {
    const test = await tx.test.create({
      data: {
        recruiterId,
        title: generatedData.title,
        description: generatedData.description,
        category: input.category,
        type: input.type,
        difficultyLevel: input.difficultyLevel,
        status: TestStatus.DRAFT,
        durationMinutes: input.durationMinutes || generatedData.durationMinutes || 30,
        passingScore: generatedData.passingScore || 70,
        randomizeQuestions: true,
        showResultsInstantly: true,
      },
    });

    for (let index = 0; index < generatedData.questions.length; index++) {
      const q = generatedData.questions[index];
      await tx.question.create({
        data: {
          testId: test.id,
          content: q.content,
          orderIndex: index + 1,
          points: q.points || 1,
          questionType: q.questionType || QuestionType.MCQ_SINGLE,
          options: q.options ? JSON.stringify(q.options) : null,
          explanation: q.explanation || null,
          codeLanguage: q.codeLanguage || null,
          codeStarter: q.codeStarter || null,
          expectedOutput: q.expectedOutput || null,
        },
      });
    }

    return tx.test.findUnique({
      where: { id: test.id },
      include: { questions: true },
    });
  });

  return createdTest;
}

async function generateWithGemini(apiKey: string, input: GenerateAITestInput): Promise<GeneratedTestStructure> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `You are an expert technical interviewer and test creator for a recruitment assessment platform.
Create a comprehensive test based on the following requirements:
- Job Topic / Skill: "${input.topic}"
- Category: ${input.category}
- Test Type: ${input.type}
- Difficulty Level: ${input.difficultyLevel}
- Number of Questions: ${input.numQuestions}
${input.customInstructions ? `- Additional Instructions: ${input.customInstructions}` : ''}

Respond STRICTLY with a valid JSON object matching this schema:
{
  "title": "Test title string",
  "description": "Short summary of what this test evaluates",
  "durationMinutes": 30,
  "passingScore": 70,
  "questions": [
    {
      "content": "Question prompt text",
      "points": 1,
      "questionType": "MCQ_SINGLE" or "MCQ_MULTI" or "TRUE_FALSE" or "SHORT_TEXT" or "LONG_ESSAY" or "CODE_EDITOR",
      "options": [
        { "label": "A", "value": "Option 1 content", "isCorrect": false },
        { "label": "B", "value": "Option 2 content", "isCorrect": true }
      ],
      "explanation": "Detailed explanation of correct answer",
      "codeLanguage": "javascript" (only if questionType is CODE_EDITOR),
      "codeStarter": "function solution() { ... }" (only if questionType is CODE_EDITOR),
      "expectedOutput": "expected return string" (only if questionType is CODE_EDITOR)
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    return JSON.parse(responseText) as GeneratedTestStructure;
  } catch (err) {
    throw new Error('Failed to parse AI-generated JSON response: ' + (err as Error).message);
  }
}

function generateMockTest(input: GenerateAITestInput): GeneratedTestStructure {
  const questions: GeneratedQuestionItem[] = [];

  for (let i = 1; i <= input.numQuestions; i++) {
    if (i % 3 === 0) {
      questions.push({
        content: `[AI Generated] Write a function to handle core logic for ${input.topic} (Scenario ${i}).`,
        points: 5,
        questionType: QuestionType.CODE_EDITOR,
        codeLanguage: 'javascript',
        codeStarter: `// Solve the problem below:\nfunction solution(inputData) {\n  // Your code here\n}`,
        expectedOutput: 'success',
        explanation: 'Evaluate correct usage of algorithms and clean code principles.',
      });
    } else {
      questions.push({
        content: `[AI Generated] What is a fundamental best practice when working with ${input.topic} in ${input.difficultyLevel.toLowerCase()} difficulty scenarios?`,
        points: 2,
        questionType: QuestionType.MCQ_SINGLE,
        options: [
          { label: 'A', value: 'Optimize for scalability and maintainability', isCorrect: true },
          { label: 'B', value: 'Ignore error handling and log warnings', isCorrect: false },
          { label: 'C', value: 'Use global variables for all state management', isCorrect: false },
          { label: 'D', value: 'Hardcode API credentials directly in client code', isCorrect: false },
        ],
        explanation: 'Scalability and maintainability are core principles in production software engineering.',
      });
    }
  }

  return {
    title: `AI Assessment: ${input.topic} (${input.difficultyLevel})`,
    description: `Auto-generated test evaluating knowledge in ${input.topic}. Configured with ${input.numQuestions} questions across ${input.category}.`,
    durationMinutes: input.durationMinutes || input.numQuestions * 5,
    passingScore: 70,
    questions,
  };
}
