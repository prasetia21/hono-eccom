import { envSchema } from "@/config/env";

const trimSlashes = (value?: string | null) => {
  return value?.trim().replace(/^\/+|\/+$/g, "") ?? "";
};

const normalizePath = (value: string) => {
  const cleaned = trimSlashes(value);
  return cleaned ? `/${cleaned}` : "";
};

export const API_PATH = trimSlashes(envSchema.API_PATH || "api");
export const API_VERSION = trimSlashes(envSchema.API_VERSION);

export const API_PREFIX = normalizePath([API_PATH, API_VERSION].filter(Boolean).join("/"));

export const DOCS_PATH = normalizePath(envSchema.DOCS_PATH || "api/docs");
export const OPENAPI_JSON_PATH = `${DOCS_PATH}/openapi.json`;
