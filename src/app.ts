import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { API_PREFIX } from "@/config/api";
import { setupSwagger } from "@/config/swagger";
import { pinoLogger } from "@/libs/logger";
import { validateContentType } from "@/middlewares/content-type.middleware";
import { requestLogger } from "@/middlewares/logger.middleware";
import { rateLimit } from "@/middlewares/rate-limit.middleware";
import routes from "@/routes/routes";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { ContentType } from "@/shared/types/content-type";
import { sendError, sendSuccess } from "@/shared/utils/response";
import { appGuard } from "@/middlewares/app-guard.middleware.ts";

const app = new OpenAPIHono<ContentType>();

// Global middlewares
app.use("*", requestLogger);
app.use("*", cors());

app.use(
  "*",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
  }),
);

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const status = err.status ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      pinoLogger.error({ err }, err.message);
    } else {
      pinoLogger.warn({ err }, err.message);
    }

    return sendError(c, err.message, status);
  }

  if (err instanceof SyntaxError) {
    pinoLogger.warn({ err }, "Malformed request body");

    return sendError(c, "Malformed JSON in request body", HTTP_STATUS.BAD_REQUEST, err.message);
  }

  pinoLogger.error({ err }, "Unhandled application error");

  return sendError(c, "Internal Server Error", HTTP_STATUS.INTERNAL_SERVER_ERROR, err.message);
});

// Base routes
app.get("/", (c) => {
  return sendSuccess(c, "API is running");
});

app.get("/readyz", (c) => {
  return c.text("ok");
});

app.use(`${API_PREFIX}/*`, appGuard());
app.use(`${API_PREFIX}/*`, validateContentType);

app.route(API_PREFIX, routes);

setupSwagger(app);

export default app;
