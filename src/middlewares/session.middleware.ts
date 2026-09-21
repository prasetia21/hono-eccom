import type { MiddlewareHandler } from "hono";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { ContentType } from "@/shared/types/content-type";
import { decryptString } from "@/shared/utils/crypto-helper.ts";
import { cacheGetSerialize, cacheSetSerialize } from "@/libs/redis.ts";
import { envSchema } from "@/config/env.ts";
import { pinoLogger } from "@/libs/logger.ts";
import { getClientIp } from "@/shared/utils/request-body.ts";

const unauthorized = (
  message = "Session expired. Silahkan close aplikasi kemudian buka lagi.",
) => ({
  success: false as const,
  message,
});

export const sessionInit = (): MiddlewareHandler<ContentType> => {
  return async (c, next) => {
    const headerSessionToken = c.req.header("X-Session-Token")?.trim();
    try {
      if (!headerSessionToken) {
        throw new Error("Session token header missing.");
      }

      const token = decryptString(headerSessionToken);

      const cachedSession = await cacheGetSerialize<string>(token);

      if (cachedSession !== null) {
        await cacheSetSerialize(token, getClientIp(c), {
          ttl: 60 * envSchema.APP_SESSION_EXPIRATION,
        });
      } else {
        throw new Error("Session token not found.");
      }

      await next();
    } catch (err) {
      pinoLogger.error({ error: err }, "Session cache failed");
      return c.json(unauthorized(), HTTP_STATUS.FORBIDDEN);
    }
  };
};
