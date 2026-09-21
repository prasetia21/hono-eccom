import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type SuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
};

export type ErrorResponse = {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
};

export const sendSuccess = <T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200,
  message?: string,
  meta?: Record<string, unknown>,
) => c.json<SuccessResponse<T>>({ success: true, data, message, meta }, status);

export const sendError = (
  c: Context,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: unknown,
) =>
  c.json<ErrorResponse>(
    {
      success: false,
      error: { message, details },
    },
    status,
  );

export const sendServerError = (c: Context, message = "Internal Server Error", details?: unknown) =>
  sendError(c, message, 500, details);
