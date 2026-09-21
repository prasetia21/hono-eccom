import type { Context, Next } from "hono";
import { pinoLogger } from "@/libs/logger";
import { HTTP_STATUS } from "@/shared/constants/http-status";

export const requestLogger = async (c: Context, next: Next) => {
  const start = performance.now();
  const method = c.req.method;
  const path = c.req.path;

  try {
    await next();
  } catch (err) {
    const duration = performance.now() - start;
    pinoLogger.error(
      {
        err,
        method,
        path,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        durationMs: duration.toFixed(2),
      },
      "Unhandled error during request",
    );
    throw err;
  }

  const duration = performance.now() - start;
  pinoLogger.info(
    {
      method,
      path,
      status: c.res.status,
      durationMs: duration.toFixed(2),
    },
    "HTTP request",
  );
};
