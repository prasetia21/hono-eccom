import type { MiddlewareHandler } from "hono";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { pinoLogger } from "@/libs/logger";
import type { ContentType } from "@/shared/types/content-type";
import { AuthService } from "@/libs/auth";
import type { RequestToken } from "@/shared/schemas/base.schema.ts";

const unauthorized = (message = "Authentication Failed") => ({
  success: false as const,
  auth: false as const,
  message,
});

const getRequestToken = async (c: any): Promise<string | undefined> => {
  let token = c.req.header("x-auth-token");

  if (!token && c.req.header("content-type")) {
    const contentType = c.req.header("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        const body = await c.req.json();
        token = body?.token;
      } else if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        const body = await c.req.parseBody();
        token = body?.token as string;
      }
    } catch (error) {
      pinoLogger.error("request token missing or invalid format", error);
    }
  }

  if (!token) {
    const validatedBody = c.get("validatedBody") as RequestToken;
    token = validatedBody?.token ?? validatedBody;
  }

  return token;
};

export const auth = (
  authService: AuthService = new AuthService(),
): MiddlewareHandler<ContentType> => {
  return async (c, next) => {
    const token = await getRequestToken(c);

    if (!token || typeof token !== "string") {
      pinoLogger.error("auth_failed:V5 token missing or invalid format");
      return c.json(unauthorized(), HTTP_STATUS.UNAUTHORIZED);
    }

    if (/^\d+$/.test(token)) {
      pinoLogger.error("auth_failed:V5 non numeric token. token:", token);
      return c.json(unauthorized(), HTTP_STATUS.UNAUTHORIZED);
    }

    if (token.length < 20) {
      pinoLogger.error("auth_failed:V5 length token. token:" + token);
      return c.json(unauthorized(), HTTP_STATUS.UNAUTHORIZED);
    }

    try {
      const authData = await authService.getTokenAuth(token);

      if (authData) {
        c.set("authData", authData);
        return await next();
      } else {
        pinoLogger.error("auth_failed:V5 redis failed. token:", token);
        return c.json(unauthorized(), HTTP_STATUS.UNAUTHORIZED);
      }
    } catch (error: any) {
      pinoLogger.error("auth_failed:v5", error);
      return c.json(
        {
          success: false,
          auth: false,
          message: "Cache server error",
          onError: error,
        },
        HTTP_STATUS.UNAUTHORIZED,
      );
    }
  };
};

export const authOpt = (
  authService: AuthService = new AuthService(),
): MiddlewareHandler<ContentType> => {
  return async (c, next) => {
    const token = await getRequestToken(c);

    if (!token || typeof token !== "string") {
      return await next();
    } else {
      if (/^\d+$/.test(token)) {
        pinoLogger.error("auth_failed:V5 non numeric token. token:", token);
        return c.json(unauthorized(), HTTP_STATUS.UNAUTHORIZED);
      }

      if (token.length < 20) {
        pinoLogger.error("auth_failed:V5 length token. token:" + token);
        return c.json(unauthorized(), HTTP_STATUS.UNAUTHORIZED);
      }

      try {
        const authData = await authService.getTokenAuth(token);
        if (authData) {
          c.set("authData", authData);
          return await next();
        } else {
          pinoLogger.error("auth_failed:V5 redis failed. token:", token);
          return c.json(unauthorized(), HTTP_STATUS.UNAUTHORIZED);
        }
      } catch (error: any) {
        pinoLogger.error("auth_failed:v5", error.message);
        return c.json(
          {
            success: false,
            auth: false,
            message: "Cache server error",
            onError: error.message,
          },
          HTTP_STATUS.UNAUTHORIZED,
        );
      }
    }
  };
};
