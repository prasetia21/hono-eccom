import { createRoute, z, type RouteConfig } from "@hono/zod-openapi";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { ErrorResponseSchema, NotFoundResponseSchema } from "@/shared/schemas/base.schema";

type OpenAPIRouteRequest = NonNullable<RouteConfig["request"]>;

export type QueryRouteSchema = NonNullable<OpenAPIRouteRequest["query"]>;

/* =========================================================================
 * SCHEMAS
 * ========================================================================= */

export const CustomHeaderSchema = z.object({
  "X-Session-Token": z.string().optional().openapi({
    description: "Session Token",
  }),
  "X-Auth-Token": z.string().optional().openapi({
    description: "Token",
  }),
});

/* =========================================================================
 * TYPES
 * ========================================================================= */

/** Definisi response error kustom (status -> description + schema). */
export type ErrorResponseDefinition = {
  description: string;
  schema: z.ZodTypeAny;
};

/** Map status code */
export type ErrorResponseMap = Record<number, ErrorResponseDefinition>;

/** Konfigurasi POST Route standar. */
export type PostRouteConfig<
  TRes extends z.ZodTypeAny = z.ZodTypeAny,
  TReq extends z.ZodTypeAny = z.ZodTypeAny,
> = {
  path: string;
  tags: string[];
  summary: string;
  description?: string;
  reqSchema?: TReq;
  reqRequired?: boolean;
  querySchema?: QueryRouteSchema;
  resSchema: TRes;
  resDescription?: string;
  withSessionToken?: boolean;
  withBadRequest?: boolean;
  errors?: ErrorResponseMap;
};

export type ModuleRouteConfig<
  TRes extends z.ZodTypeAny = z.ZodTypeAny,
  TReq extends z.ZodTypeAny = z.ZodTypeAny,
> = Omit<PostRouteConfig<TRes, TReq>, "tags" | "resSchema"> & {
  resSchema?: TRes;
};

export type ModuleRouteDefaults<
  TRes extends z.ZodTypeAny = z.ZodTypeAny,
  TReq extends z.ZodTypeAny = z.ZodTypeAny,
> = {
  tags: string[];
  reqSchema?: TReq;
  resSchema: TRes;
  resDescription?: string;
  withBadRequest?: boolean;
  withSessionToken?: boolean;
  errors?: ErrorResponseMap;
};

/* =========================================================================
 * CONTENT BUILDERS
 * ========================================================================= */

/** Content JSON tunggal. */
export const jsonContent = <T extends z.ZodTypeAny>(schema: T) => ({
  "application/json": { schema },
});

/** Request Body JSON dan Form-Url-Encoded (Tanpa File/Image). */
export const reqJsonAndFormUrlEncoded = <T extends z.ZodTypeAny>(schema: T, required = false) => ({
  required,
  content: {
    "application/json": { schema },
    "application/x-www-form-urlencoded": { schema },
  },
});

/**
 * Request Body JSON, Form-Url-Encoded, DAN Multipart Form-Data.
 * Gunakan ini jika endpoint menerima file/gambar atau form-data biasa.
 */
export const reqAllFormats = <T extends z.ZodTypeAny>(schema: T, required = false) => ({
  required,
  content: {
    "application/json": { schema },
    "application/x-www-form-urlencoded": { schema },
    "multipart/form-data": { schema },
  },
});

/** Response sukses (HTTP 200). */
export const resOK = <T extends z.ZodTypeAny>(schema: T, description = "Berhasil") => ({
  description,
  content: jsonContent(schema),
});

/** Response error generik (400/401/404/500/...). */
export const resError = <T extends z.ZodTypeAny>(schema: T, description = "Terjadi kesalahan") => ({
  description,
  content: jsonContent(schema),
});

/* =========================================================================
 * PARAM METADATA
 * ========================================================================= */

export type FieldMeta = Record<string, unknown>;

export const asQueryParam = <M extends FieldMeta>(name: string, meta: M) => ({
  ...meta,
  param: { name, in: "query" as const },
});

/** Varian untuk path param. */
export const asPathParam = <M extends FieldMeta>(name: string, meta: M) => ({
  ...meta,
  param: { name, in: "path" as const, required: true },
});

/* =========================================================================
 * ERROR SHORTHANDS
 * ========================================================================= */

/** 400 — validasi input gagal. */
export const errBadRequest = (
  description = "Validasi input gagal",
  schema: z.ZodTypeAny = ErrorResponseSchema,
): ErrorResponseDefinition => ({ description, schema });

/** 404 — data tidak ditemukan. */
export const errNotFound = (
  description = "Data tidak ditemukan",
  schema: z.ZodTypeAny = NotFoundResponseSchema,
): ErrorResponseDefinition => ({ description, schema });

export const buildErrorResponses = (errors: ErrorResponseMap = {}) =>
  Object.entries(errors).reduce(
    (acc, [status, data]) => {
      acc[Number(status)] = resError(data.schema, data.description);
      return acc;
    },
    {} as Record<number, ReturnType<typeof resError>>,
  );

/* =========================================================================
 * ROUTE BUILDERS
 * ========================================================================= */

/**
 * POST Route standar (dengan body).
 */
export const createStandardPostRoute = <TRes extends z.ZodTypeAny, TReq extends z.ZodTypeAny>(
  config: PostRouteConfig<TRes, TReq> & {
    reqSchema: TReq;
  },
) => {
  const requestConfig: RouteConfig["request"] = {
    body: reqAllFormats(config.reqSchema, config.reqRequired ?? true),
  };

  if (config.querySchema) {
    requestConfig.query = config.querySchema;
  }

  if (config.withSessionToken) {
    requestConfig.headers = CustomHeaderSchema;
  }

  return createRoute({
    method: "post" as const,
    path: config.path,
    tags: config.tags,
    summary: config.summary,
    description: config.description ?? config.summary,
    request: requestConfig,
    responses: {
      [HTTP_STATUS.OK]: resOK(config.resSchema, config.resDescription),
      ...(config.withBadRequest === false
        ? {}
        : {
            [HTTP_STATUS.BAD_REQUEST]: resError(ErrorResponseSchema, "Validasi input gagal"),
          }),
      // Error kustom (404, 401, dst) — ditaruh terakhir agar bisa override default
      ...buildErrorResponses(config.errors),
    },
  });
};

/** POST Route tanpa request body */
export const createStandardPostRouteNoBody = <TRes extends z.ZodTypeAny>(
  config: Omit<PostRouteConfig<TRes>, "reqSchema" | "reqRequired" | "withBadRequest">,
) => {
  let requestConfig: RouteConfig["request"] | undefined = undefined;

  if (config.withSessionToken) {
    requestConfig = {
      headers: CustomHeaderSchema,
    };
  }

  return createRoute({
    method: "post" as const,
    path: config.path,
    tags: config.tags,
    summary: config.summary,
    description: config.description ?? config.summary,
    ...(requestConfig ? { request: requestConfig } : {}),
    responses: {
      [HTTP_STATUS.OK]: resOK(config.resSchema, config.resDescription),
      ...buildErrorResponses(config.errors),
    },
  });
};

/**
 * Factory per-module: mengunci tags + schema default,
 */
export const createPostRouteFactory = <TDefReq extends z.ZodTypeAny, TDefRes extends z.ZodTypeAny>(
  defaults: ModuleRouteDefaults<TDefRes, TDefReq> & { reqSchema: TDefReq },
) => {
  return <TRes extends z.ZodTypeAny = TDefRes, TReq extends z.ZodTypeAny = TDefReq>(
    config: ModuleRouteConfig<TRes, TReq>,
  ) =>
    createStandardPostRoute({
      ...config,
      tags: defaults.tags,
      reqSchema: (config.reqSchema ?? defaults.reqSchema) as TReq,
      resSchema: (config.resSchema ?? defaults.resSchema) as unknown as TRes,
      resDescription: config.resDescription ?? defaults.resDescription,
      withBadRequest: config.withBadRequest ?? defaults.withBadRequest,
      withSessionToken: config.withSessionToken ?? defaults.withSessionToken,
      errors: { ...defaults.errors, ...config.errors },
    });
};
