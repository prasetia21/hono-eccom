export type ProviderHttpResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  headers?: Headers;
  error?: string;
};

export type ProviderRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string> | Headers;
  json?: unknown;
  form?: Record<string, any>;
  basicAuth?: {
    username: string;
    password: string;
  };
  bearerAuth?: string;
  timeoutMs?: number;
};

export const providerRequest = async <T>(
  url: string,
  options: ProviderRequestOptions = {},
): Promise<ProviderHttpResult<T>> => {
  const headers = new Headers(options.headers);
  let body: string | undefined;

  if (!headers.has("User-Agent")) {
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
  }

  if (options.json !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    body = JSON.stringify(options.json);
  } else if (options.form) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/x-www-form-urlencoded");
    }
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(options.form)) {
      if (v !== undefined && v !== null) {
        sp.append(k, String(v));
      }
    }
    body = sp.toString();
  }

  if (options.basicAuth) {
    const credentials = Buffer.from(
      `${options.basicAuth.username}:${options.basicAuth.password}`,
    ).toString("base64");
    headers.set("Authorization", `Basic ${credentials}`);
  } else if (options.bearerAuth) {
    headers.set("Authorization", `Bearer ${options.bearerAuth}`);
  }

  const timeout = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 30_000;

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: AbortSignal.timeout(timeout),
    });

    const rawBody = await response.text();
    let data: T | null = null;

    if (rawBody) {
      try {
        data = JSON.parse(rawBody) as T;
      } catch {
        data = rawBody as unknown as T;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers,
    };
  } catch (err: any) {
    const causeMsg = err?.cause?.message ? ` (${err.cause.message})` : "";
    const errorDetail = `${err?.message ?? "Network error"}${causeMsg}`;

    return {
      ok: false,
      status: 0,
      data: null,
      error: errorDetail,
    };
  }
};
