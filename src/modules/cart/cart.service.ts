import {
  type CartAddV3Params,
  type CheckoutNowParams,
  CartRepository,
  type CartQtyV3Params,
} from "./cart.repository.ts";
import { HTTP_STATUS } from "@/shared/constants/http-status.ts";
import { toSnakeCase } from "@/shared/utils/case-transform.ts";
import type {
  AddCartServiceResult,
  CartDeleteAllServiceResult,
  CartDeleteServiceResult,
  CartSelectedAllServiceResult,
  CartSelectedMerchantServiceResult,
  CartSelectedServiceResult,
  CheckoutNowServiceResult,
  GetCartServiceResult,
  ProductCheckoutV3ServiceResult,
  UpdateCartServiceResult,
} from "./cart.dto.ts";

export class CartService {
  private repository: CartRepository;

  constructor() {
    this.repository = new CartRepository();
  }

  async getCartV3(customerId: number): Promise<GetCartServiceResult> {
    const cartV3 = await this.repository.getCartV3({
      customerId,
    });

    return {
      success: true,
      message: "Data ditemukan",
      data: toSnakeCase(cartV3 ?? []),
      statusCode: HTTP_STATUS.OK,
    };
  }

  async addCartV3(params: CartAddV3Params): Promise<AddCartServiceResult> {
    const result = await this.repository.addCartV3(params);

    if (result.success && result.data) {
      return {
        ...result,
        data: toSnakeCase(result.data),
      };
    }

    return result;
  }

  async checkoutNow(params: CheckoutNowParams): Promise<CheckoutNowServiceResult> {
    const result = await this.repository.checkoutNow(params);

    if (result.success && result.data) {
      return {
        ...result,
        data: toSnakeCase(result.data),
      };
    }

    return result;
  }

  async cartQtyV3(params: CartQtyV3Params): Promise<UpdateCartServiceResult> {
    return this.repository.cartQtyV3(params);
  }

  async cartDeleteV2(customerId: number, cartId: number): Promise<CartDeleteServiceResult> {
    return this.repository.cartDeleteV2(customerId, cartId);
  }

  async cartDeleteAllV2(customerId: number): Promise<CartDeleteAllServiceResult> {
    return this.repository.cartDeleteAllV2(customerId);
  }

  async cartSelectedV2(customerId: number, cartId: number): Promise<CartSelectedServiceResult> {
    return this.repository.cartSelectedV2(customerId, cartId);
  }

  async cartSelectedAll(
    customerId: number,
    status: "on" | "off",
  ): Promise<CartSelectedAllServiceResult> {
    return this.repository.cartSelectedAll(customerId, status);
  }

  async cartSelectedMerchant(
    customerId: number,
    merchantId: number,
  ): Promise<CartSelectedMerchantServiceResult> {
    return this.repository.cartSelectedMerchant(customerId, merchantId);
  }

  async productCheckoutV3(customerId: number): Promise<ProductCheckoutV3ServiceResult> {
    const result = await this.repository.productCheckoutV3(customerId);

    if (result.success && result.data) {
      return {
        ...result,
        data: toSnakeCase(result.data),
      };
    }

    return result;
  }
}
