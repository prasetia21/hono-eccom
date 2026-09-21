import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";

import { CategoryController } from "./init.controller";
import { getChildCategoryRoute } from "./init.openapi";

const initRoutes = new OpenAPIHono<ContentType>();
const categoryController = new CategoryController();

routeHandler(initRoutes, getChildCategoryRoute, categoryController.getChildCategory);

export { initRoutes };
