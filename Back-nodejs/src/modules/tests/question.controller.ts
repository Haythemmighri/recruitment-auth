import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { sendSuccess, sendCreated, sendError } from '../../utils/response.util';
import {
  createQuestionSchema,
  updateQuestionSchema,
} from './test.validators';
import * as testService from './test.service';

export const addQuestion = async (req: Request, res: Response) => {
  try {
    const dto = createQuestionSchema.parse(req.body);
    const question = await testService.addQuestion(
      req.params.testId,
      req.user!.id,
      dto
    );
    return sendCreated(res, question, 'Question added');
  } catch (err) {
    if (err instanceof ZodError)
      return sendError(res, 'Validation failed', 422, err.flatten().fieldErrors as any);
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const dto = updateQuestionSchema.parse(req.body);
    const question = await testService.updateQuestion(
      req.params.testId,
      req.params.questionId,
      req.user!.id,
      dto
    );
    return sendSuccess(res, question, 'Question updated');
  } catch (err) {
    if (err instanceof ZodError)
      return sendError(res, 'Validation failed', 422, err.flatten().fieldErrors as any);
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    await testService.deleteQuestion(
      req.params.testId,
      req.params.questionId,
      req.user!.id
    );
    return sendSuccess(res, null, 'Question deleted');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};
