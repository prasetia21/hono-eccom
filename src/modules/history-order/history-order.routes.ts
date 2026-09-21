import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";

import { HistoryOrderController } from "./history-order.controller";
import { getHistoryOrderRoute, getShippingTrackingRoute } from "./history-order.openapi";
import { auth } from "@/middlewares/auth.middleware";

const historyOrderRoutes = new OpenAPIHono<ContentType>();
const historyOrderController = new HistoryOrderController();

routeHandler(historyOrderRoutes, getHistoryOrderRoute, historyOrderController.getHistoryOrder, [
  auth(),
]);

routeHandler(
  historyOrderRoutes,
  getShippingTrackingRoute,
  historyOrderController.getShippingTracking,
  [auth()],
);

export { historyOrderRoutes };
