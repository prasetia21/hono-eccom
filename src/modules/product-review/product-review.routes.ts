import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";
import { auth, authOpt } from "@/middlewares/auth.middleware";

import { ProductReviewController } from "./product-review.controller";
import { addReviewRoute, getProductReviewRoute, reportReviewRoute } from "./product-review.openapi";

const productReviewRoutes = new OpenAPIHono<ContentType>();
const productReviewController = new ProductReviewController();

routeHandler(productReviewRoutes, addReviewRoute, productReviewController.addReview, [auth()]);

routeHandler(
  productReviewRoutes,
  getProductReviewRoute,
  productReviewController.getProductReview,
  [],
);

routeHandler(productReviewRoutes, reportReviewRoute, productReviewController.reportReview, [
  authOpt(),
]);

export { productReviewRoutes };
