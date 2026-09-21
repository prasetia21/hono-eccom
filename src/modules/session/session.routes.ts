import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";

import { SessionController } from "./session.controller";
import { getSessionRoute } from "./session.openapi";

const sessionRoutes = new OpenAPIHono<ContentType>();
const sessionController = new SessionController();

routeHandler(sessionRoutes, getSessionRoute, sessionController.session);

export { sessionRoutes };
