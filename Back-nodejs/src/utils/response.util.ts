import { Response } from 'express';

// ─── Response shapes ──────────────────────────────────────────────────────────

interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T | null;
  meta?: Record<string, unknown>;
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function sendSuccess<T>(
  res: Response,
  data: T | null,
  message = 'Success',
  statusCode = 200,
  meta?: Record<string, unknown>
): Response {
  const body: SuccessResponse<T> = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(
  res: Response,
  data: T | null,
  message = 'Created successfully'
): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]>
): Response {
  const body: ErrorResponse = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}
