import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { sendSuccess, sendCreated, sendError } from '../../utils/response.util';
import { submitAnswersSchema, gradeSubmissionSchema } from './test.validators';
import * as submissionService from './submission.service';
import * as testService from './test.service';

// ─── Candidate ────────────────────────────────────────────────────────────────

export const startSubmission = async (req: Request, res: Response) => {
  try {
    const submission = await submissionService.startSubmission(
      req.params.testId,
      req.user!.id
    );
    return sendCreated(res, submission, 'Submission started');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const getMySubmission = async (req: Request, res: Response) => {
  try {
    const submission = await submissionService.getMySubmission(
      req.params.testId,
      req.user!.id
    );
    return sendSuccess(res, submission, 'Submission retrieved');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const submitAnswers = async (req: Request, res: Response) => {
  try {
    const dto = submitAnswersSchema.parse(req.body);
    const submission = await submissionService.submitAnswers(
      req.params.submissionId,
      req.user!.id,
      dto
    );
    return sendSuccess(res, submission, 'Answers saved');
  } catch (err) {
    if (err instanceof ZodError)
      return sendError(res, 'Validation failed', 422, err.flatten().fieldErrors as any);
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const finalizeSubmission = async (req: Request, res: Response) => {
  try {
    const submission = await submissionService.finalizeSubmission(
      req.params.submissionId,
      req.user!.id
    );
    return sendSuccess(res, submission, 'Test submitted successfully');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

// ─── Recruiter ────────────────────────────────────────────────────────────────

export const gradeSubmission = async (req: Request, res: Response) => {
  try {
    const dto = gradeSubmissionSchema.parse(req.body);
    const submission = await submissionService.gradeSubmission(
      req.params.submissionId,
      req.user!.id,
      dto.score
    );
    return sendSuccess(res, submission, 'Submission graded');
  } catch (err) {
    if (err instanceof ZodError)
      return sendError(res, 'Validation failed', 422, err.flatten().fieldErrors as any);
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

// ─── Subscriptions — Candidate ────────────────────────────────────────────────

export const subscribeToTest = async (req: Request, res: Response) => {
  try {
    const subscription = await testService.subscribeToTest(req.params.testId, req.user!.id);
    return sendCreated(res, subscription, 'Subscription request submitted');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const getMySubscriptions = async (req: Request, res: Response) => {
  try {
    const subscriptions = await testService.getMySubscriptions(req.user!.id);
    return sendSuccess(res, subscriptions, 'Subscriptions retrieved');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

// ─── Subscriptions — Admin ────────────────────────────────────────────────────

export const listPendingSubscriptions = async (req: Request, res: Response) => {
  try {
    const subscriptions = await testService.listPendingSubscriptions();
    return sendSuccess(res, subscriptions, 'Pending subscriptions retrieved');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const approveSubscription = async (req: Request, res: Response) => {
  try {
    const subscription = await testService.approveSubscription(req.params.id);
    return sendSuccess(res, subscription, 'Subscription approved');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const rejectSubscription = async (req: Request, res: Response) => {
  try {
    const subscription = await testService.rejectSubscription(req.params.id);
    return sendSuccess(res, subscription, 'Subscription rejected');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};
