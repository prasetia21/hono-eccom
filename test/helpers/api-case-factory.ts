export const DEFAULT_OPENAPI_JSON_PATHS = [
  "/api/docs/openapi.json",
  "/openapi.json",
  "/doc",
  "/docs/openapi.json",
  "/api-docs",
  "/swagger.json",
  "/openapi",
] as const;

export type HttpMethod = "get" | "post" | "put" | "patch";

type MaybePromise<T> = T | Promise<T>;

export type HonoLikeApp = {
  request: (input: string, requestInit?: RequestInit) => MaybePromise<Response>;
};

type OpenApiSchema = {
  $ref?: string;
  type?: string | string[];
  format?: string;
  nullable?: boolean;
  enum?: unknown[];
  default?: unknown;
  example?: unknown;
  examples?: unknown[];
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  additionalProperties?: boolean | OpenApiSchema;
  minLength?: number;
  minimum?: number;
};

type OpenApiContent = {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, { value?: unknown }>;
};

type OpenApiParameter = {
  $ref?: string;
  name?: string;
  in?: "query" | "path" | "header" | "cookie";
  required?: boolean;
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, { value?: unknown }>;
};

type OpenApiRequestBody = {
  $ref?: string;
  required?: boolean;
  content?: Record<string, OpenApiContent>;
};

export type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, unknown>;
};

export type OpenApiPathItem = Partial<Record<HttpMethod, OpenApiOperation>> & {
  parameters?: OpenApiParameter[];
};

export type OpenApiDocument = {
  openapi: string;
  paths: Record<string, OpenApiPathItem>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    parameters?: Record<string, OpenApiParameter>;
    requestBodies?: Record<string, OpenApiRequestBody>;
  };
};

export type ApiRequestCase = {
  name: string;
  method: HttpMethod;
  path: string;
  url: string;
  init: RequestInit;
  expectedStatuses: number[];
  hasDefaultResponse: boolean;
};

export type RequestOverride = {
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  expectedStatuses?: number[];
};

export type BuildCasesOptions = {
  methods?: readonly HttpMethod[];
  /**
   * Dipakai jika paths di OpenAPI belum memuat mount prefix, contoh `/api/v1`.
   * Jika path sudah diawali basePath, helper tidak akan menambahkan ulang.
   */
  basePath?: string;
  skip?: Array<string | RegExp | ((method: HttpMethod, path: string) => boolean)>;
  /**
   * Key override bisa berbentuk:
   * - `POST /blog/detail`
   * - `POST /api/v1/blog/detail`
   */
  overrides?: Record<string, RequestOverride>;
  defaultHeaders?: Record<string, string>;
};

export async function findOpenApiDocument(
  app: HonoLikeApp,
  candidates: readonly string[] = DEFAULT_OPENAPI_JSON_PATHS,
): Promise<{ document: OpenApiDocument; path: string }> {
  for (const path of candidates) {
    const response = await app.request(path);
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok || !contentType.includes("json")) {
      continue;
    }

    const body = (await response.json().catch(() => null)) as unknown;

    if (isOpenApiDocument(body)) {
      return { document: body, path };
    }
  }

  throw new Error(
    `OpenAPI JSON document tidak ditemukan. Path yang dicoba: ${candidates.join(", ")}`,
  );
}

export function buildOpenApiRequestCases(
  document: OpenApiDocument,
  options: BuildCasesOptions = {},
): ApiRequestCase[] {
  const methods = options.methods ?? (["get", "post", "put", "patch"] as const);
  const cases: ApiRequestCase[] = [];

  for (const [rawPath, pathItem] of Object.entries(document.paths)) {
    for (const method of methods) {
      const operation = pathItem[method];

      if (!operation) continue;
      if (shouldSkip(method, rawPath, options.skip)) continue;

      const mountedPath = applyBasePath(rawPath, options.basePath);
      const operationWithPathParameters: OpenApiOperation = {
        ...operation,
        parameters: [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])],
      };

      const request = buildRequestFromOperation(
        document,
        method,
        mountedPath,
        operationWithPathParameters,
      );

      const initWithDefaults: RequestInit = {
        ...request.init,
        headers: {
          ...(request.init.headers as Record<string, string> | undefined),
          ...options.defaultHeaders,
        },
      };

      const override = findOverride(options.overrides, method, rawPath, mountedPath);
      const init = mergeRequestInit(initWithDefaults, override);

      const expectedStatuses = override?.expectedStatuses ?? getExpectedStatuses(operation);

      cases.push({
        name: `${method.toUpperCase()} ${mountedPath}`,
        method,
        path: mountedPath,
        url: override?.url ?? request.url,
        init,
        expectedStatuses,
        hasDefaultResponse: Boolean(operation.responses?.default),
      });
    }
  }

  return cases.sort((a, b) => a.name.localeCompare(b.name));
}

function isOpenApiDocument(value: unknown): value is OpenApiDocument {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<OpenApiDocument>;

  return typeof candidate.openapi === "string" && Boolean(candidate.paths);
}

function shouldSkip(
  method: HttpMethod,
  path: string,
  skipRules: BuildCasesOptions["skip"] = [],
): boolean {
  const key = `${method.toUpperCase()} ${path}`;

  return skipRules.some((rule) => {
    if (typeof rule === "string") return rule === key || rule === path;
    if (rule instanceof RegExp) return rule.test(key) || rule.test(path);
    return rule(method, path);
  });
}

function findOverride(
  overrides: BuildCasesOptions["overrides"],
  method: HttpMethod,
  rawPath: string,
  mountedPath: string,
): RequestOverride | undefined {
  if (!overrides) return undefined;

  return (
    overrides[`${method.toUpperCase()} ${mountedPath}`] ??
    overrides[`${method.toUpperCase()} ${rawPath}`] ??
    overrides[mountedPath] ??
    overrides[rawPath]
  );
}

function applyBasePath(path: string, basePath = ""): string {
  if (!basePath) return path;

  const normalizedBase = `/${basePath}`.replace(/\/+/g, "/").replace(/\/$/, "");
  const normalizedPath = `/${path}`.replace(/\/+/g, "/");

  if (normalizedPath === normalizedBase || normalizedPath.startsWith(`${normalizedBase}/`)) {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`.replace(/\/+/g, "/");
}

function buildRequestFromOperation(
  document: OpenApiDocument,
  method: HttpMethod,
  path: string,
  operation: OpenApiOperation,
): { url: string; init: RequestInit } {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  let url = path;
  const query = new URLSearchParams();

  for (const parameterOrRef of operation.parameters ?? []) {
    const parameter = resolveParameter(document, parameterOrRef);
    if (!parameter?.name || !parameter.in) continue;

    const value = sampleFromParameter(document, parameter);
    if (value === undefined || value === null) continue;

    if (parameter.in === "path") {
      url = url
        .replace(`{${parameter.name}}`, encodeURIComponent(String(value)))
        .replace(`:${parameter.name}`, encodeURIComponent(String(value)));
    }

    if (parameter.in === "query") {
      query.set(parameter.name, String(value));
    }

    if (parameter.in === "header") {
      headers[parameter.name] = String(value);
    }
  }

  const queryString = query.toString();
  if (queryString) {
    url += `${url.includes("?") ? "&" : "?"}${queryString}`;
  }

  const requestBody = resolveRequestBody(document, operation.requestBody);
  const jsonContent = pickJsonContent(requestBody?.content);
  const body = jsonContent ? sampleFromContent(document, jsonContent) : undefined;

  const init: RequestInit = {
    method: method.toUpperCase(),
    headers,
  };

  // Untuk POST/PUT/PATCH, kirim JSON `{}` walaupun OpenAPI tidak mendefinisikan body.
  if (method === "post" || method === "put" || method === "patch" || body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body ?? {});
  }

  return { url, init };
}

function mergeRequestInit(init: RequestInit, override?: RequestOverride): RequestInit {
  if (!override) return init;

  const headers = {
    ...(init.headers as Record<string, string> | undefined),
    ...override.headers,
  };

  const merged: RequestInit = {
    ...init,
    headers,
  };

  if (override.body !== undefined) {
    headers["Content-Type"] ??= "application/json";
    merged.body = JSON.stringify(override.body);
  }

  return merged;
}

function resolveParameter(
  document: OpenApiDocument,
  parameter: OpenApiParameter,
): OpenApiParameter | undefined {
  if (parameter.$ref) {
    return resolveRef<OpenApiParameter>(document, parameter.$ref);
  }

  return parameter;
}

function resolveRequestBody(
  document: OpenApiDocument,
  requestBody?: OpenApiRequestBody,
): OpenApiRequestBody | undefined {
  if (!requestBody) return undefined;

  if (requestBody.$ref) {
    return resolveRef<OpenApiRequestBody>(document, requestBody.$ref);
  }

  return requestBody;
}

function resolveSchema(
  document: OpenApiDocument,
  schema?: OpenApiSchema,
): OpenApiSchema | undefined {
  if (!schema) return undefined;

  if (schema.$ref) {
    return resolveRef<OpenApiSchema>(document, schema.$ref);
  }

  return schema;
}

function resolveRef<T>(document: OpenApiDocument, ref: string): T | undefined {
  if (!ref.startsWith("#/")) return undefined;

  const parts = ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current: unknown = document;

  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current as T | undefined;
}

function pickJsonContent(content?: Record<string, OpenApiContent>): OpenApiContent | undefined {
  if (!content) return undefined;

  return (
    content["application/json"] ??
    content["application/merge-patch+json"] ??
    Object.entries(content).find(([contentType]) => contentType.includes("json"))?.[1]
  );
}

function sampleFromContent(document: OpenApiDocument, content: OpenApiContent): unknown {
  if (content.example !== undefined) return content.example;

  const example = Object.values(content.examples ?? {})[0]?.value;
  if (example !== undefined) return example;

  return sampleFromSchema(document, content.schema);
}

function sampleFromParameter(document: OpenApiDocument, parameter: OpenApiParameter): unknown {
  if (parameter.example !== undefined) return parameter.example;

  const example = Object.values(parameter.examples ?? {})[0]?.value;
  if (example !== undefined) return example;

  return sampleFromSchema(document, parameter.schema);
}

function sampleFromSchema(
  document: OpenApiDocument,
  schemaOrRef?: OpenApiSchema,
  depth = 0,
): unknown {
  const schema = resolveSchema(document, schemaOrRef);
  if (!schema || depth > 10) return undefined;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];

  if (schema.allOf?.length) {
    const samples = schema.allOf.map((item) => sampleFromSchema(document, item, depth + 1));

    if (samples.every((sample) => isPlainObject(sample))) {
      return Object.assign({}, ...samples);
    }

    return samples.find((sample) => sample !== undefined);
  }

  const oneOfOrAnyOf = schema.oneOf ?? schema.anyOf;
  if (oneOfOrAnyOf?.length) {
    return sampleFromSchema(document, oneOfOrAnyOf[0], depth + 1);
  }

  const type = Array.isArray(schema.type)
    ? schema.type.find((item) => item !== "null")
    : schema.type;

  if (type === "object" || schema.properties) {
    const properties = schema.properties ?? {};
    const requiredKeys = new Set(schema.required ?? []);
    const result: Record<string, unknown> = {};

    // Untuk body request, isi field required saja agar payload tetap minimal.
    for (const key of requiredKeys) {
      result[key] = sampleFromSchema(document, properties[key], depth + 1);
    }

    return result;
  }

  if (type === "array") {
    return [sampleFromSchema(document, schema.items, depth + 1) ?? "test"];
  }

  if (type === "integer" || type === "number") {
    return schema.minimum ?? 1;
  }

  if (type === "boolean") {
    return true;
  }

  // Default untuk string dan schema tanpa type eksplisit.
  switch (schema.format) {
    case "date-time":
      return "2026-07-26T00:00:00.000Z";
    case "date":
      return "2026-07-26";
    case "uuid":
      return "00000000-0000-4000-8000-000000000000";
    case "email":
      return "user@example.test";
    case "uri":
    case "url":
      return "https://example.test";
    default:
      return schema.minLength && schema.minLength > 4 ? "test-value" : "test";
  }
}

function getExpectedStatuses(operation: OpenApiOperation): number[] {
  const statuses = Object.keys(operation.responses ?? {})
    .filter((status) => status !== "default")
    .map((status) => Number.parseInt(status, 10))
    .filter((status): status is number => Number.isInteger(status));

  return statuses.length > 0 ? statuses : [200, 201, 204];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
