import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";

import { OrderController } from "./order.controller.ts";
import { cancelOrderRoute, finishOrderRoute, transactionV3Route } from "./order.openapi.ts";
import { auth, authOpt } from "@/middlewares/auth.middleware";

const orderRoutes = new OpenAPIHono<ContentType>();
const orderController = new OrderController();

routeHandler(orderRoutes, transactionV3Route, orderController.transactionV3, [auth()]);
routeHandler(orderRoutes, finishOrderRoute, orderController.finishOrder, [authOpt()]);
routeHandler(orderRoutes, cancelOrderRoute, orderController.cancelOrder, [authOpt()]);

export { orderRoutes };
