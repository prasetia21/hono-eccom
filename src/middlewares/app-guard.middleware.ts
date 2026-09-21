import type { MiddlewareHandler } from "hono";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { ContentType } from "@/shared/types/content-type";
import { envSchema } from "@/config/env.ts";

const unauthorized = (message = "Request Timeout. API Key not found.") => ({
  success: false as const,
  message,
});

export const appGuard = (): MiddlewareHandler<ContentType> => {
  return async (c, next) => {
    const apiKey = c.req.header("Api-Key")?.trim();

    if (!apiKey) {
      return c.json(unauthorized("Request Timeout. API Key not found"), HTTP_STATUS.NOT_FOUND);
    } else {
      if (apiKey !== envSchema.APP_API_KEY) {
        return c.json(unauthorized("Request Timeout. Invalid API Key"), HTTP_STATUS.FORBIDDEN);
      } else {
        await next();
      }
    }
  };
};
