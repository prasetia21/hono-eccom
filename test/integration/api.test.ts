import "../helpers/setup";

import { beforeAll, describe, expect, it } from "vitest";
import {
  buildOpenApiRequestCases,
  findOpenApiDocument,
  type ApiRequestCase,
  type HttpMethod,
  type OpenApiDocument,
} from "../helpers/api-case-factory";
import app from "../../src/app";
import { API_PREFIX, OPENAPI_JSON_PATH } from "@/config/api.ts";
import { pinoLogger } from "@/libs/logger.ts";
import { envSchema } from "@/config/env.ts";

const TARGET_METHODS = ["get", "post", "put", "patch"] as const satisfies readonly HttpMethod[];

const INTEGRATION_TEST_TIMEOUT = 30_000;
const SLOW_REQUEST_THRESHOLD_MS = 1_000;

type RequestTiming = {
  name: string;
  method: HttpMethod;
  url: string;
  status: number | "ERROR";
  durationMs: number;
};

const formatMs = (durationMs: number) => {
  return `${durationMs.toFixed(2)}ms`;
};

describe("Global API integration via Hono app.request()", () => {
  let openApiDocument: OpenApiDocument;
  let openApiJsonPath = "";
  let cases: ApiRequestCase[] = [];
  const apiKey = envSchema.APP_API_KEY ?? "test-api-key";

  let sessionToken = "";

  beforeAll(async () => {
    const result = await findOpenApiDocument(app, [OPENAPI_JSON_PATH]);

    openApiDocument = result.document;
    openApiJsonPath = result.path;

    const sessionRes = await app.request(`${API_PREFIX}/session/init`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Api-Key": apiKey,
      },
      body: JSON.stringify({}),
    });

    expect(sessionRes.status).toBe(200);

    const sessionJson = (await sessionRes.json()) as { token: string };
    sessionToken = sessionJson.token;

    cases = buildOpenApiRequestCases(openApiDocument, {
      methods: TARGET_METHODS,
      basePath: API_PREFIX,
      skip: [/\/docs$/, /\/openapi\.json$/],
      overrides: {
        /**
         * Contoh override jika endpoint tertentu perlu payload/header khusus:
         *
         * 'POST /frontend/blog/detail': {
         *   body: { alias: 'test-blog' },
         *   expectedStatuses: [200, 404],
         * },
         *
         * 'GET /frontend/users/me': {
         *   headers: { Authorization: 'Bearer test-token' },
         *   expectedStatuses: [200, 401],
         * },
         */
      },
      defaultHeaders: {
        "Api-Key": apiKey,
        "X-Session-Token": sessionToken,
      },
    });
  });

  it("serves downloadable OpenAPI JSON document", async () => {
    const startedAt = performance.now();

    const response = await app.request(openApiJsonPath);
    const durationMs = performance.now() - startedAt;

    pinoLogger.info(
      `[integration] GET ${openApiJsonPath} -> ${response.status} (${formatMs(durationMs)})`,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as OpenApiDocument;

    expect(body.openapi).toMatch(/^3\./);
    expect(body.paths).toBeTypeOf("object");
    expect(Object.keys(body.paths).length).toBeGreaterThan(0);
  });

  it("GET /readyz returns ok without starting HTTP server", async () => {
    const startedAt = performance.now();

    const response = await app.request("/readyz");
    const durationMs = performance.now() - startedAt;

    pinoLogger.info(`[integration] GET /readyz -> ${response.status} (${formatMs(durationMs)})`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  for (const method of TARGET_METHODS) {
    it(
      `${method.toUpperCase()} endpoints from OpenAPI return a documented status`,
      async () => {
        const selectedCases = cases.filter((item) => item.method === method);
        const timings: RequestTiming[] = [];

        if (selectedCases.length === 0) {
          expect(selectedCases).toHaveLength(0);
          return;
        }

        for (const testCase of selectedCases) {
          const startedAt = performance.now();

          let response: Response;
          let text = "";

          try {
            response = await app.request(testCase.url, testCase.init);
            text = await response.text();

            const durationMs = performance.now() - startedAt;

            timings.push({
              name: testCase.name,
              method: testCase.method,
              url: testCase.url,
              status: response.status,
              durationMs,
            });

            const slowMarker = durationMs >= SLOW_REQUEST_THRESHOLD_MS ? " ⚠️ SLOW" : "";

            pinoLogger.info(
              `[integration] ${testCase.name} -> ${response.status} (${formatMs(
                durationMs,
              )})${slowMarker}`,
            );

            const isDocumentedStatus = testCase.expectedStatuses.includes(response.status);

            const isAllowedByDefaultResponse = testCase.hasDefaultResponse && response.status < 500;

            expect(
              isDocumentedStatus || isAllowedByDefaultResponse,
              `${testCase.name} returned ${response.status} in ${formatMs(
                durationMs,
              )}. Expected one of: ${testCase.expectedStatuses.join(
                ", ",
              )}. Body: ${text.slice(0, 800)}`,
            ).toBe(true);

            if (response.status !== 204 && text.length > 0) {
              expect(
                () => JSON.parse(text),
                `${testCase.name} should return a JSON response`,
              ).not.toThrow();
            }
          } catch (error) {
            const durationMs = performance.now() - startedAt;

            timings.push({
              name: testCase.name,
              method: testCase.method,
              url: testCase.url,
              status: "ERROR",
              durationMs,
            });

            pinoLogger.error(`[integration] ${testCase.name} -> ERROR (${formatMs(durationMs)})`);

            throw error;
          }
        }

        const sortedTimings = [...timings].sort((a, b) => b.durationMs - a.durationMs);

        console.table(
          sortedTimings.map((item) => ({
            method: item.method.toUpperCase(),
            name: item.name,
            url: item.url,
            status: item.status,
            durationMs: Number(item.durationMs.toFixed(2)),
            slow: item.durationMs >= SLOW_REQUEST_THRESHOLD_MS,
          })),
        );
      },
      INTEGRATION_TEST_TIMEOUT,
    );
  }
});
