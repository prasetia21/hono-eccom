import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";

import { CourierController } from "./courier.controller";
import { deliveryPriceV2Route } from "./courier.openapi";
import { authOpt } from "@/middlewares/auth.middleware";

const courierRoutes = new OpenAPIHono<ContentType>();
const courierController = new CourierController();

routeHandler(courierRoutes, deliveryPriceV2Route, courierController.deliveryPriceV2, [authOpt()]);

export { courierRoutes };
