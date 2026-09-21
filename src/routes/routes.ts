import { OpenAPIHono } from "@hono/zod-openapi";
import { sendSuccess } from "@/shared/utils/response";
import { checkRedisConnection } from "@/libs/redis";
import { checkDbConnection } from "@/libs/postgresql";
import { checkS3Connection } from "@/libs/s3";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { ContentType } from "@/shared/types/content-type";
import { sessionInit } from "@/middlewares/session.middleware.ts";

// module routes
import { sessionRoutes } from "@/modules/session/session.routes";
import { productRoutes } from "@/modules/product";
import { courierRoutes } from "@/modules/courier";
import { productCategoryRoutes } from "@/modules/product-category";
import { initRoutes } from "@/modules/init";
import { productReviewRoutes } from "@/modules/product-review";
import { paymentMethodRoutes } from "@/modules/payment-method/payment-method.routes.ts";
import { historyOrderRoutes } from "@/modules/history-order";
import { cartRoutes } from "@/modules/cart/cart.routes.ts";
import { courierExpeditionRoutes } from "@/modules/courier-expedition/courier-expedition.routes";
import { orderRoutes } from "@/modules/order";

const routes = new OpenAPIHono<ContentType>();

// Health Check
routes.get("/healthz", async (c) => {
  const [redis, postgresql, s3] = await Promise.all([
    checkRedisConnection(),
    checkDbConnection(),
    checkS3Connection(),
  ]);

  const checks = { redis, postgresql, s3 } as const;

  const allHealthy = Object.values(checks).every((check) => check.status === "connected");

  return sendSuccess(
    c,
    {
      status: allHealthy ? "ok" : "degraded",
      checks,
    },
    allHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE,
  );
});

// register module routes
routes.route("/session", sessionRoutes);

// guard by middleware session
routes.use("*", sessionInit());
routes.route("/get", initRoutes);
routes.route("/ecommerce", productRoutes);
routes.route("/ecommerce", productCategoryRoutes);
routes.route("/ecommerce", productReviewRoutes);
routes.route("/ecommerce", paymentMethodRoutes);
routes.route("/history", historyOrderRoutes);
routes.route("/delivery", courierRoutes);
routes.route("/cart", cartRoutes);
routes.route("/delive_price_v2", courierExpeditionRoutes);
routes.route("/order", orderRoutes);

export default routes;
