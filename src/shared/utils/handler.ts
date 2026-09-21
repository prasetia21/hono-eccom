import type { Handler, MiddlewareHandler } from "hono";
import type { OpenAPIHono, RouteConfig, z } from "@hono/zod-openapi";

import { validateContentType } from "@/middlewares/content-type.middleware.ts";
import {
  validateRequest,
  type RequestBodySchemas,
  type ValidateRequestOptions,
} from "@/middlewares/validate-request.middleware";
import type { ContentType } from "@/shared/types/content-type";

type DocumentedRoute = RouteConfig & {
  getRoutingPath(): string;
};

type OpenAPIContentEntry = {
  schema?: unknown;
};

type OpenAPIContent = Record<string, OpenAPIContentEntry | undefined>;

const isZodSchema = (value: unknown): value is z.ZodTypeAny => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  return typeof (value as { safeParseAsync?: unknown }).safeParseAsync === "function";
};

const getSchema = (
  content: OpenAPIContent | undefined,
  mediaType: string,
): z.ZodTypeAny | undefined => {
  const schema = content?.[mediaType]?.schema;
  return isZodSchema(schema) ? schema : undefined;
};

const getRequestBodySchemas = (route: DocumentedRoute): RequestBodySchemas => {
  const content = route.request?.body?.content as OpenAPIContent | undefined;

  return {
    json: getSchema(content, "application/json"),
    urlencoded: getSchema(content, "application/x-www-form-urlencoded"),
    multipart: getSchema(content, "multipart/form-data"),
  };
};

const getQuerySchema = (route: DocumentedRoute): z.ZodTypeAny | undefined => {
  const query = route.request?.query;
  return isZodSchema(query) ? query : undefined;
};

const getParamsSchema = (route: DocumentedRoute): z.ZodTypeAny | undefined => {
  const params = route.request?.params;
  return isZodSchema(params) ? params : undefined;
};

export function routeHandler(
  app: OpenAPIHono<ContentType>,
  route: DocumentedRoute,
  handler: Handler<ContentType>,
  customMiddlewares: MiddlewareHandler<ContentType>[] = [],
): void {
  app.openAPIRegistry.registerPath(route);

  const path = route.getRoutingPath();

  const bodySchemas = getRequestBodySchemas(route);
  const querySchema = getQuerySchema(route);
  const paramsSchema = getParamsSchema(route);

  const hasBodySchema = Object.values(bodySchemas).some(Boolean);
  const hasValidation = hasBodySchema || Boolean(querySchema) || Boolean(paramsSchema);

  const middlewares: MiddlewareHandler<ContentType>[] = [...customMiddlewares];

  if (hasValidation) {
    const options: ValidateRequestOptions = {
      ...(hasBodySchema && {
        body: bodySchemas,
        bodyRequired: route.request?.body?.required ?? false,
      }),
      ...(querySchema && { query: querySchema }),
      ...(paramsSchema && { params: paramsSchema }),
    };

    if (hasBodySchema) {
      middlewares.push(validateContentType);
    }

    middlewares.push(validateRequest(options));
  }

  app.on([route.method], [path], ...middlewares, handler);
}
