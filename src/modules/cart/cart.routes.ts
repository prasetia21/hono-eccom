import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentType } from "@/shared/types/content-type";
import { routeHandler } from "@/shared/utils/handler";

import { CartController } from "./cart.controller";
import {
  addCartV3Route,
  getCartV3Route,
  checkoutNowRoute,
  cartQtyV3Route,
  cartDeleteV2Route,
  cartDeleteAllV2Route,
  cartSelectedV2Route,
  cartSelectedAllRoute,
  cartSelectedMerchantRoute,
  productCheckoutV3Route,
} from "./cart.openapi";
import { auth } from "@/middlewares/auth.middleware.ts";

const cartRoutes = new OpenAPIHono<ContentType>();
const cartController = new CartController();

routeHandler(cartRoutes, getCartV3Route, cartController.getCartV3, [auth()]);

routeHandler(cartRoutes, addCartV3Route, cartController.addCartV3, [auth()]);

routeHandler(cartRoutes, checkoutNowRoute, cartController.checkoutNow, [auth()]);

routeHandler(cartRoutes, cartQtyV3Route, cartController.cartQtyV3, [auth()]);

routeHandler(cartRoutes, cartDeleteV2Route, cartController.cartDeleteV2, [auth()]);

routeHandler(cartRoutes, cartDeleteAllV2Route, cartController.cartDeleteAllV2, [auth()]);

routeHandler(cartRoutes, cartSelectedV2Route, cartController.cartSelectedV2, [auth()]);

routeHandler(cartRoutes, cartSelectedAllRoute, cartController.cartSelectedAll, [auth()]);

routeHandler(cartRoutes, cartSelectedMerchantRoute, cartController.cartSelectedMerchant, [auth()]);

routeHandler(cartRoutes, productCheckoutV3Route, cartController.productCheckoutV3, [auth()]);

export { cartRoutes };
