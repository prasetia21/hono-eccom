import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";

import { PaymentMethodController } from "./payment-method.controller";
import { getPaymentMethodRoute } from "./payment-method.openapi";

const paymentMethodRoutes = new OpenAPIHono<ContentType>();
const paymentMethodController = new PaymentMethodController();

routeHandler(paymentMethodRoutes, getPaymentMethodRoute, paymentMethodController.getPaymentMethod);

export { paymentMethodRoutes };
