import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { sendCreated, sendError, sendSuccess } from '../../utils/response.util';
import { GenerateAITestInputSchema, generateTestWithAI } from './ai-generator.service';

export const generateAITest = async (req: Request, res: Response) => {
  try {
    const input = GenerateAITestInputSchema.parse(req.body);
    const result = await generateTestWithAI(req.user!.id, input);
    if (!result) {
      return sendError(res, 'Failed to generate test', 500);
    }

    if ('preview' in result && result.preview) {
      return sendSuccess(res, result, 'AI test generated successfully (Preview Mode)');
    }

    return sendCreated(res, result, 'AI test generated and created successfully');
  } catch (err) {
    if (err instanceof ZodError) {
      return sendError(res, 'Validation failed', 422, err.flatten().fieldErrors as any);
    }
    return sendError(res, (err as any).message ?? 'Failed to generate AI test', (err as any).status ?? 500);
  }
};
