import type { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { allTags } from "@/config/openapi-tags";
import { DOCS_PATH, OPENAPI_JSON_PATH } from "@/config/api";
import type { ContentType } from "@/shared/types/content-type";

export const setupSwagger = (app: OpenAPIHono<ContentType>): void => {
  app.openAPIRegistry.registerComponent("securitySchemes", "ApiKey", {
    type: "apiKey",
    in: "header",
    name: "Api-Key",
    description: "Masukkan Api-Key di sini",
  });

  app.doc(OPENAPI_JSON_PATH, {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "Dokumentasi API - Hono + Drizzle + Zod OpenAPI",
      contact: {
        name: "Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: "/",
        description: "Current Server",
      },
    ],

    tags: allTags,
    security: [
      {
        ApiKey: [],
      },
    ],
  });

  app.get(
    DOCS_PATH,
    swaggerUI({
      url: OPENAPI_JSON_PATH,
      title: "API Documentation",
    }),
  );
};
