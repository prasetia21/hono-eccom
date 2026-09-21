import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentType } from "@/shared/types/content-type";
import { HTTP_STATUS } from "@/shared/constants/http-status.ts";
import { getConnInfo } from "@hono/node-server/conninfo";

export type ParsedRequestBody = Record<string, unknown>;

const isRecord = (value: unknown): value is ParsedRequestBody => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const parseJsonBody = async (c: Context<ContentType>): Promise<ParsedRequestBody> => {
  let parsed: unknown;

  try {
    parsed = await c.req.json();
  } catch {
    throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
      message: "Malformed JSON in request body",
    });
  }

  if (!isRecord(parsed)) {
    throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
      message: "JSON request body must be an object",
    });
  }

  return parsed;
};

const parseFormBody = async (c: Context<ContentType>): Promise<ParsedRequestBody> => {
  try {
    return (await c.req.parseBody({ all: true })) as ParsedRequestBody;
  } catch {
    throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
      message: "Malformed multipart/form-data request body",
    });
  }
};

/* ------------------------------------------------------------------ */
/*  Bracket-notation parser (qs-lite tanpa dependensi eksternal)       */
/*  "data[name]=Budi&data[email]=x" → { data: { name, email } }       */
/* ------------------------------------------------------------------ */

const assignNested = (target: Record<string, unknown>, key: string, value: string): void => {
  const bracketMatch = key.match(/^(.+?)\[(.+?)]$/);

  if (!bracketMatch || bracketMatch.length < 3) {
    target[key] = value;
    return;
  }

  const parent = bracketMatch[1]!;
  const child = bracketMatch[2]!;

  if (target[parent] === undefined) {
    target[parent] = {};
  }

  const existing = target[parent];

  if (isRecord(existing)) {
    (existing as Record<string, unknown>)[child] = value;
  }
};

const parsedecodeUrlComponent = (str: string): string => {
  return decodeURIComponent(str.replace(/\+/g, " "));
};

const parseUrlencodedParams = (raw: string): ParsedRequestBody => {
  const result: Record<string, unknown> = {};

  for (const part of raw.split("&")) {
    const sep = part.indexOf("=");

    if (sep === -1) {
      assignNested(result, parsedecodeUrlComponent(part), "");
    } else {
      const key = parsedecodeUrlComponent(part.slice(0, sep));
      const value = parsedecodeUrlComponent(part.slice(sep + 1));
      assignNested(result, key, value);
    }
  }

  return result;
};

const parseUrlencodedOrJson = async (c: Context<ContentType>): Promise<ParsedRequestBody> => {
  let raw: string;

  try {
    raw = await c.req.text();
  } catch {
    throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
      message: "Failed to read request body",
    });
  }

  if (!raw.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (isRecord(parsed)) {
      return parsed as ParsedRequestBody;
    }
  } catch {
    //   parse failed
  }

  return parseUrlencodedParams(raw);
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export const getRequestBody = (c: Context<ContentType>): Promise<ParsedRequestBody> => {
  const requestBodyType = c.get("requestBodyType") ?? "none";

  switch (requestBodyType) {
    case "json":
      return parseJsonBody(c);

    case "urlencoded":
      return parseUrlencodedOrJson(c);

    case "multipart":
      return parseFormBody(c);

    case "none":
    default:
      return Promise.resolve({});
  }
};

export const getBodyString = (body: ParsedRequestBody, key: string): string | undefined => {
  const value = body[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const firstValue = value[0];

    if (typeof firstValue === "string") {
      return firstValue;
    }

    if (typeof firstValue === "number" || typeof firstValue === "boolean") {
      return String(firstValue);
    }
  }

  return undefined;
};

const getRemoteAddressFromConnInfo = (c: Context): string | undefined => {
  try {
    return getConnInfo(c)?.remote?.address;
  } catch {
    return undefined;
  }
};

export const getClientIp = (c: Context): string => {
  let ip =
    c.req.header("cf-connecting-ip")?.trim() ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip")?.trim() ||
    getRemoteAddressFromConnInfo(c) ||
    "unknown";

  if (ip === "::1") {
    ip = "172.18.0.1";
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  return ip;
};
