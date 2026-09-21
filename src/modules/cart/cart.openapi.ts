import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { createStandardPostRoute, errBadRequest, errNotFound } from "@/shared/utils/openapi-helper"; // Atau createStandardGetRoute jika endpoint-nya GET
import {
  GetCartRequestSchema,
  GetCartResponseSchema,
  AddCartRequestSchema,
  AddCartResponseSchema,
  CheckoutNowRequestSchema,
  type CheckoutNowRequest,
  CheckoutNowResponseSchema,
  CartQtyV3RequestSchema,
  CartQtyV3ResponseSchema,
  CartDeleteV2RequestSchema,
  CartDeleteV2ResponseSchema,
  CartDeleteAllV2ResponseSchema,
  CartDeleteAllV2RequestSchema,
  CartSelectedV2RequestSchema,
  CartSelectedV2ResponseSchema,
  CartSelectedAllRequestSchema,
  CartSelectedAllResponseSchema,
  CartSelectedMerchantRequestSchema,
  CartSelectedMerchantResponseSchema,
  ProductCheckoutV3RequestSchema,
  ProductCheckoutV3ResponseSchema,
} from "./cart.dto";

/* =========================================================================
 * TAG
 *========================================================================= */

export const cartTag: OpenAPITagDefinition = {
  name: "Cart",
  description: "Endpoint untuk mendapatkan data cart",
};

const TAGS = [cartTag.name];

/* =========================================================================
 * ROUTE
 *========================================================================= */

/** POST /cart/v3 */
export const getCartV3Route = createStandardPostRoute({
  path: "/v3",
  tags: TAGS,
  summary: "Get Cart v3",
  description: "Mendapatkan daftar cart.",
  reqSchema: GetCartRequestSchema,
  reqRequired: false,
  resSchema: GetCartResponseSchema,
  resDescription: "Berhasil mendapatkan data",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});

/** POST /cart/cart_add_v3 */
export const addCartV3Route = createStandardPostRoute({
  path: "/cart_add_v3",
  tags: TAGS,
  summary: "Add Cart",
  description: "Menambahkan produk ke keranjang",
  reqSchema: AddCartRequestSchema,
  reqRequired: true,
  resSchema: AddCartResponseSchema,
  resDescription: "Produk berhasil ditambahkan ke Keranjang",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
    [HTTP_STATUS.NOT_FOUND]: errNotFound("Data tidak ditemukan"),
  },
});

/** POST /cart/checkout-now */
export const checkoutNowRoute = createStandardPostRoute({
  path: "/checkout-now",
  tags: TAGS,
  summary: "Checkout Now",
  description: "Menambahkan produk langsung ke keranjang untuk proses checkout",
  reqSchema: CheckoutNowRequestSchema,
  reqRequired: true,
  resSchema: CheckoutNowResponseSchema,
  resDescription: "Produk berhasil ditambahkan ke Keranjang",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
    [HTTP_STATUS.NOT_FOUND]: errNotFound("Data tidak ditemukan"),
  },
});

/** POST /cart/cart_qty_v3 */
export const cartQtyV3Route = createStandardPostRoute({
  path: "/cart_qty_v3",
  tags: TAGS,
  summary: "Update Cart Quantity",
  description: "Memperbarui quantity produk pada cart",
  reqSchema: CartQtyV3RequestSchema,
  reqRequired: true,
  resSchema: CartQtyV3ResponseSchema,
  resDescription: "Data berhasil diperbarui",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
    [HTTP_STATUS.NOT_FOUND]: errNotFound("Data tidak ditemukan"),
  },
});

/** POST /cart/cart_delete_v2 */
export const cartDeleteV2Route = createStandardPostRoute({
  path: "/cart_delete_v2",
  tags: TAGS,
  summary: "Delete Cart",
  description: "Menghapus produk dari cart",
  reqSchema: CartDeleteV2RequestSchema,
  reqRequired: true,
  resSchema: CartDeleteV2ResponseSchema,
  resDescription: "Data berhasil dihapus",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),

    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),

    [HTTP_STATUS.NOT_FOUND]: errNotFound("Data tidak ditemukan"),
  },
});

/** POST /cart/cart_delete_all_v2 */
export const cartDeleteAllV2Route = createStandardPostRoute({
  path: "/cart_delete_all_v2",
  tags: TAGS,
  summary: "Delete All Cart",
  description: "Menghapus seluruh produk dari cart customer",
  reqSchema: CartDeleteAllV2RequestSchema,
  reqRequired: false,
  resSchema: CartDeleteAllV2ResponseSchema,
  resDescription: "Data berhasil dihapus",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),

    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});

/** POST /cart/cart_selected_v2 */
export const cartSelectedV2Route = createStandardPostRoute({
  path: "/cart_selected_v2",
  tags: TAGS,
  summary: "Select Cart",
  description: "Mengubah status pilihan produk pada cart",
  reqSchema: CartSelectedV2RequestSchema,
  reqRequired: true,
  resSchema: CartSelectedV2ResponseSchema,
  resDescription: "Data berhasil diperbarui",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),

    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),

    [HTTP_STATUS.NOT_FOUND]: errNotFound("Data tidak ditemukan"),
  },
});

/** POST /cart/cart_selected_all */
export const cartSelectedAllRoute = createStandardPostRoute({
  path: "/cart_selected_all",
  tags: TAGS,
  summary: "Select All Cart",
  description: "Mengubah status seluruh cart customer",
  reqSchema: CartSelectedAllRequestSchema,
  reqRequired: true,
  resSchema: CartSelectedAllResponseSchema,
  resDescription: "Data berhasil diperbarui",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),

    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});

/** POST /cart/cart_selected_merchant */
export const cartSelectedMerchantRoute = createStandardPostRoute({
  path: "/cart_selected_merchant",
  tags: TAGS,
  summary: "Select Cart by Merchant",
  description: "Mengubah status seluruh cart berdasarkan merchant",
  reqSchema: CartSelectedMerchantRequestSchema,
  reqRequired: true,
  resSchema: CartSelectedMerchantResponseSchema,
  resDescription: "Data berhasil diperbarui",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),

    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});

/** POST /cart/product_checkout_v3 */
export const productCheckoutV3Route = createStandardPostRoute({
  path: "/product_checkout_v3",
  tags: TAGS,
  summary: "Product Checkout",
  description: "Memvalidasi dan mengambil data produk yang siap untuk checkout",
  reqSchema: ProductCheckoutV3RequestSchema,
  reqRequired: false,
  resSchema: ProductCheckoutV3ResponseSchema,
  resDescription: "Data checkout",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),

    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});
