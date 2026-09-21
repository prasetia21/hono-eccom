import type { MiddlewareHandler } from "hono";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { ContentType, RequestBodyType } from "@/shared/types/content-type";
import { sendError } from "@/shared/utils/response";

/** Method HTTP yang secara praktis dapat membawa request body. */
const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SUPPORTED_CONTENT_TYPES = [
  "application/json",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
] as const;

type SupportedRequestBodyType = Exclude<RequestBodyType, "none">;

const getMediaType = (contentType: string): string => {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
};

const resolveRequestBodyType = (contentType: string): SupportedRequestBodyType | null => {
  switch (getMediaType(contentType)) {
    case "application/json":
      return "json";
    case "application/x-www-form-urlencoded":
      return "urlencoded";
    case "multipart/form-data":
      return "multipart";
    default:
      return null;
  }
};

const requestHasBody = (contentLength?: string, transferEncoding?: string): boolean => {
  if (transferEncoding?.trim()) {
    return true;
  }

  if (!contentLength) {
    return false;
  }

  const length = Number(contentLength);
  return Number.isFinite(length) && length > 0;
};

export const validateContentType: MiddlewareHandler<ContentType> = async (c, next) => {
  const method = c.req.method.toUpperCase();

  if (!BODY_METHODS.has(method)) {
    c.set("requestBodyType", "none");
    return await next();
  }

  const contentType = c.req.header("content-type");

  if (!contentType) {
    const hasBody = requestHasBody(
      c.req.header("content-length"),
      c.req.header("transfer-encoding"),
    );

    if (hasBody) {
      return sendError(c, "Content-Type header is required", HTTP_STATUS.UNSUPPORTED_CONTENT_TYPE, {
        expected: SUPPORTED_CONTENT_TYPES,
      });
    }

    c.set("requestBodyType", "none");
    return await next();
  }

  const requestBodyType = resolveRequestBodyType(contentType);

  if (!requestBodyType) {
    return sendError(c, "Unsupported content type", HTTP_STATUS.UNSUPPORTED_CONTENT_TYPE, {
      received: getMediaType(contentType),
      expected: SUPPORTED_CONTENT_TYPES,
    });
  }

  if (requestBodyType === "multipart" && !contentType.toLowerCase().includes("boundary=")) {
    return sendError(c, "Multipart boundary is missing", HTTP_STATUS.BAD_REQUEST);
  }

  c.set("requestBodyType", requestBodyType);
  return await next();
};
