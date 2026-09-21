import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";

import { CourierExpeditionController } from "./courier-expedition.controller.ts";
import { courierExpeditionPriceRoute } from "./courier-expedition.openapi.ts";
import { authOpt } from "@/middlewares/auth.middleware";

const courierExpeditionRoutes = new OpenAPIHono<ContentType>();
const courierExpeditionController = new CourierExpeditionController();

routeHandler(
  courierExpeditionRoutes,
  courierExpeditionPriceRoute,
  courierExpeditionController.getCourierPrice,
  [authOpt()],
);

export { courierExpeditionRoutes };
