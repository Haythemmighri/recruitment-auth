import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../../utils/response.util';
import {
  createTestSchema,
  updateTestSchema,
  listTestsQuerySchema,
} from './test.validators';
import * as testService from './test.service';

// ─── Recruiter — Test CRUD ────────────────────────────────────────────────────

export const createTest = async (req: Request, res: Response) => {
  try {
    const dto = createTestSchema.parse(req.body);
    const test = await testService.createTest(req.user!.id, dto);
    return sendCreated(res, test, 'Test created successfully');
  } catch (err) {
    if (err instanceof ZodError)
      return sendError(res, 'Validation failed', 422, err.flatten().fieldErrors as any);
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const listMyTests = async (req: Request, res: Response) => {
  try {
    const query = listTestsQuerySchema.parse(req.query);
    const result = await testService.listRecruiterTests(req.user!.id, query);
    return sendSuccess(res, result.tests, 'Tests retrieved', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const getTest = async (req: Request, res: Response) => {
  try {
    const test = await testService.getTestById(req.params.id);
    if (!test) return sendError(res, 'Test not found', 404);
    return sendSuccess(res, test, 'Test retrieved');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const updateTest = async (req: Request, res: Response) => {
  try {
    const dto = updateTestSchema.parse(req.body);
    const test = await testService.updateTest(req.params.id, req.user!.id, dto);
    return sendSuccess(res, test, 'Test updated');
  } catch (err) {
    if (err instanceof ZodError)
      return sendError(res, 'Validation failed', 422, err.flatten().fieldErrors as any);
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const submitForReview = async (req: Request, res: Response) => {
  try {
    const test = await testService.submitForReview(req.params.id, req.user!.id);
    return sendSuccess(res, test, 'Test submitted for admin review');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const archiveTest = async (req: Request, res: Response) => {
  try {
    await testService.archiveTest(req.params.id, req.user!.id);
    return sendNoContent(res);
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const getTestSubmissions = async (req: Request, res: Response) => {
  try {
    const submissions = await testService.getTestSubmissions(
      req.params.id,
      req.user!.id
    );
    return sendSuccess(res, submissions, 'Submissions retrieved');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};


export const listPublishedTests = async (req: Request, res: Response) => {
  try {
    const query = listTestsQuerySchema.parse(req.query);
    const result = await testService.listPublishedTests(query);
    return sendSuccess(res, result.tests, 'Tests retrieved', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const getPublishedTest = async (req: Request, res: Response) => {
  try {
    const test = await testService.getTestById(req.params.id);
    if (!test || test.status !== 'PUBLISHED') return sendError(res, 'Test not found', 404);

    // Strip correct-answer hints before sending to candidate
    const sanitized = {
      ...test,
      questions: test.questions.map((q) => {
        const options = q.options
          ? (JSON.parse(q.options) as Array<any>).map(({ label, value }) => ({
              label,
              value,
            }))
          : null;
        return {
          id: q.id,
          content: q.content,
          orderIndex: q.orderIndex,
          points: q.points,
          options,
        };
      }),
    };
    return sendSuccess(res, sanitized, 'Test retrieved');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};
// ─── Admin — Review ───────────────────────────────────────────────────────────

export const listPendingTests = async (req: Request, res: Response) => {
  try {
    const query = listTestsQuerySchema.parse(req.query);
    const result = await testService.listPendingTests(query);
    return sendSuccess(res, result.tests, 'Pending tests retrieved', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const approveTest = async (req: Request, res: Response) => {
  try {
    const test = await testService.approveTest(req.params.id);
    return sendSuccess(res, test, 'Test approved and published');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};

export const rejectTest = async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0)
      return sendError(res, 'Rejection reason is required', 422);
    const test = await testService.rejectTest(req.params.id, reason.trim());
    return sendSuccess(res, test, 'Test rejected');
  } catch (err) {
    return sendError(res, (err as any).message ?? 'Internal error', (err as any).status ?? 500);
  }
};
