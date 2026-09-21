import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";

import { ProductCategoryController } from "./product-category.controller";
import {
  productCategoryByIdRoute,
  productCategoryRecommendRoute,
} from "./product-category.openapi";
import { authOpt } from "@/middlewares/auth.middleware";

const productCategoryRoutes = new OpenAPIHono<ContentType>();
const productCategoryController = new ProductCategoryController();

routeHandler(
  productCategoryRoutes,
  productCategoryByIdRoute,
  productCategoryController.categoryById,
  [authOpt()],
);

routeHandler(
  productCategoryRoutes,
  productCategoryRecommendRoute,
  productCategoryController.categoryRecommend,
  [authOpt()],
);

export { productCategoryRoutes };
