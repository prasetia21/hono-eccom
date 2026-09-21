import type { MiddlewareHandler } from "hono";
import type { z } from "@hono/zod-openapi";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { ContentType, RequestBodyType } from "@/shared/types/content-type";
import { getRequestBody } from "@/shared/utils/request-body";
import { sendError } from "@/shared/utils/response";

type SupportedBodyType = Exclude<RequestBodyType, "none">;

export type RequestBodySchemas = Partial<Record<SupportedBodyType, z.ZodTypeAny>>;

export type ValidateRequestOptions = {
  body?: RequestBodySchemas;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  bodyRequired?: boolean;
};

type PayloadRecord = Record<string, unknown>;

const toPayloadRecord = (value: unknown): PayloadRecord => {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as PayloadRecord;
  }

  return {};
};

const formatIssues = (
  issues: Array<{
    path: PropertyKey[];
    code: string;
    message: string;
  }>,
) => {
  return issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    code: issue.code,
    message: issue.message,
  }));
};

const getFirstBodySchema = (schemas: RequestBodySchemas): z.ZodTypeAny | undefined => {
  return schemas.json ?? schemas.urlencoded ?? schemas.multipart;
};

export const validateRequest = (
  options: ValidateRequestOptions,
): MiddlewareHandler<ContentType> => {
  const {
    body: bodySchemas,
    query: querySchema,
    params: paramsSchema,
    bodyRequired = false,
  } = options;

  return async (c, next) => {
    let validatedQuery: PayloadRecord = {};

    if (querySchema) {
      const rawQuery = c.req.query();

      const parsedQuery = await querySchema.safeParseAsync(rawQuery);

      if (!parsedQuery.success) {
        return sendError(
          c,
          parsedQuery.error.issues[0]?.message ?? "Query parameter tidak valid",
          HTTP_STATUS.BAD_REQUEST,
          {
            source: "query",
            issues: formatIssues(parsedQuery.error.issues),
          },
        );
      }

      validatedQuery = toPayloadRecord(parsedQuery.data);
    }

    c.set("validatedQuery", validatedQuery);

    let validatedBody: PayloadRecord = {};

    if (bodySchemas) {
      const requestBodyType = c.get("requestBodyType") ?? "none";

      if (bodyRequired && requestBodyType === "none") {
        return sendError(c, "Request body is required", HTTP_STATUS.BAD_REQUEST);
      }

      if (requestBodyType !== "none") {
        const bodySchema = bodySchemas[requestBodyType];

        if (!bodySchema) {
          return sendError(
            c,
            "Content type is not supported by this endpoint",
            HTTP_STATUS.UNSUPPORTED_CONTENT_TYPE,
            {
              received: requestBodyType,
              supported: Object.keys(bodySchemas),
            },
          );
        }

        const rawBody = await getRequestBody(c);

        const parsedBody = await bodySchema.safeParseAsync(rawBody);

        if (!parsedBody.success) {
          return sendError(
            c,
            parsedBody.error.issues[0]?.message ?? "Payload tidak valid",
            HTTP_STATUS.BAD_REQUEST,
            {
              source: "body",
              issues: formatIssues(parsedBody.error.issues),
            },
          );
        }

        validatedBody = toPayloadRecord(parsedBody.data);
      } else {
        const defaultSchema = getFirstBodySchema(bodySchemas);

        if (defaultSchema) {
          const parsedEmpty = await defaultSchema.safeParseAsync({});

          if (parsedEmpty.success) {
            validatedBody = toPayloadRecord(parsedEmpty.data);
          }
        }
      }
    }

    c.set("validatedBody", validatedBody);

    let validatedParams: PayloadRecord = {};

    if (paramsSchema) {
      const rawParams = c.req.param();

      const parsedParams = await paramsSchema.safeParseAsync(rawParams);

      if (!parsedParams.success) {
        return sendError(
          c,
          parsedParams.error.issues[0]?.message ?? "Path parameter tidak valid",
          HTTP_STATUS.BAD_REQUEST,
          {
            source: "params",
            issues: formatIssues(parsedParams.error.issues),
          },
        );
      }

      validatedParams = toPayloadRecord(parsedParams.data);
    }

    c.set("validatedParams", validatedParams);

    return await next();
  };
};
