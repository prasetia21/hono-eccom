import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { CartService } from "./cart.service.ts";
import type {
  AddCartRequest,
  CartDeleteV2Request,
  CartQtyV3Request,
  CartSelectedAllRequest,
  CartSelectedMerchantRequest,
  CartSelectedV2Request,
  CheckoutNowRequest,
} from "@/modules/cart/cart.dto.ts";

export class CartController {
  private service: CartService;

  constructor() {
    this.service = new CartService();
  }

  getCartV3 = async (c: Context<ContentType>): Promise<Response> => {
    const authData = c.get("authData");
    const customerId = Number(authData?.customer_id) || 0;

    const result = await this.service.getCartV3(customerId);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  addCartV3 = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as AddCartRequest;

    const authData = c.get("authData");

    if (!authData) {
      return c.json(
        {
          success: false,
          auth: false,
          message: "Unauthorized",
        },
        401,
      );
    }

    const customerId = Number(authData.customer_id);
    const merchantId = Number(authData.merchant_id);

    const result = await this.service.addCartV3({
      customerId,
      merchantId,
      productId: payload.product_id,
      qty: payload.qty,
      note: payload.note ?? null,
      productVariant:
        payload.product_variant === null ||
        payload.product_variant === undefined ||
        payload.product_variant === 0
          ? null
          : payload.product_variant,
    });

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  checkoutNow = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as CheckoutNowRequest;

    const authData = c.get("authData");

    if (!authData) {
      return c.json(
        {
          success: false,
          auth: false,
          message: "Unauthorized",
        },
        401,
      );
    }

    const customerId = Number(authData.customer_id);
    const merchantId = Number(authData.merchant_id);

    const result = await this.service.checkoutNow({
      customerId,
      merchantId,
      productId: payload.product_id,
      qty: payload.qty,
      note: payload.note ?? null,
      productVariant:
        payload.product_variant === null || payload.product_variant === undefined
          ? null
          : payload.product_variant,
    });

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  cartQtyV3 = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as CartQtyV3Request;

    const result = await this.service.cartQtyV3({
      cartId: payload.cart_id,
      qty: payload.qty,
    });

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  cartDeleteV2 = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as CartDeleteV2Request;

    const authData = c.get("authData");

    if (!authData) {
      return c.json(
        {
          success: false,
          message: "Unauthorized",
        },
        401,
      );
    }

    const customerId = Number(authData.customer_id);

    const result = await this.service.cartDeleteV2(customerId, payload.cart_id);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  cartDeleteAllV2 = async (c: Context<ContentType>): Promise<Response> => {
    const authData = c.get("authData");

    if (!authData) {
      return c.json(
        {
          success: false,
          message: "Unauthorized",
        },
        401,
      );
    }

    const customerId = Number(authData.customer_id);
    const result = await this.service.cartDeleteAllV2(customerId);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  cartSelectedV2 = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as CartSelectedV2Request;

    const authData = c.get("authData");

    if (!authData) {
      return c.json(
        {
          success: false,
          message: "Unauthorized",
        },
        401,
      );
    }

    const customerId = Number(authData.customer_id);

    const result = await this.service.cartSelectedV2(customerId, payload.cart_id);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  cartSelectedAll = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as CartSelectedAllRequest;

    const authData = c.get("authData");

    if (!authData) {
      return c.json(
        {
          success: false,
          message: "Unauthorized",
        },
        401,
      );
    }

    const customerId = Number(authData.customer_id);

    const result = await this.service.cartSelectedAll(customerId, payload.status);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  cartSelectedMerchant = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as CartSelectedMerchantRequest;

    const authData = c.get("authData");

    if (!authData) {
      return c.json(
        {
          success: false,
          message: "Unauthorized",
        },
        401,
      );
    }

    const customerId = Number(authData.customer_id);

    const result = await this.service.cartSelectedMerchant(customerId, payload.merchant_id);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  productCheckoutV3 = async (c: Context<ContentType>): Promise<Response> => {
    const authData = c.get("authData");

    if (!authData) {
      return c.json(
        {
          success: false,
          message: "Unauthorized",
        },
        401,
      );
    }

    const customerId = Number(authData.customer_id);

    const result = await this.service.productCheckoutV3(customerId);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
