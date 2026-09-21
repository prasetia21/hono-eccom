import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";

import { ProductController } from "./product.controller";
import {
  productByCategoryRoute,
  productCategoryRecommendRoute,
  productCatMostViewRoute,
} from "./product.openapi";
import { authOpt } from "@/middlewares/auth.middleware";

const productRoutes = new OpenAPIHono<ContentType>();
const productController = new ProductController();

routeHandler(productRoutes, productByCategoryRoute, productController.productByCategory, [
  authOpt(),
]);

routeHandler(productRoutes, productCategoryRecommendRoute, productController.categoryRecommend, [
  authOpt(),
]);

routeHandler(productRoutes, productCatMostViewRoute, productController.productCatMostView, [
  authOpt(),
]);

export { productRoutes };
