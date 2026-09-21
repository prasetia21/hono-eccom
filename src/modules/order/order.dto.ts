import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/* =========================================================================
 * REQUEST SCHEMAS
 *========================================================================= */

export const CancelOrderRequestSchema = z
  .object({
    order_id: z.coerce.number().int().min(1, "Order ID is required").openapi({
      example: 1,
      description: "ID pesanan yang dibatalkan",
    }),
    order_cancel_note: z.string().min(1, "Mohon isi alasan pembatalan pesanan!").openapi({
      example: "Berubah pikiran",
      description: "Alasan pembatalan pesanan",
    }),
  })
  .openapi("CancelOrderRequest");

export const FinishOrderRequestSchema = z
  .object({
    order_id: z.coerce.number().int().min(1, "Order ID is required").openapi({
      example: 1,
      description: "ID pesanan yang dikonfirmasi selesai",
    }),
    order_finish_note: z.string().min(1, "Mohon isi keterangan konfirmasi pesanan!").openapi({
      example: "Barang sudah diterima",
      description: "Keterangan konfirmasi pesanan",
    }),
  })
  .openapi("FinishOrderRequest");

/* -------------------------------------------------------------------------
 * Transaction v3 (migrasi `transaction_v3` + `payment_method_request_v2`)
 * Field sengaja `.nullish()` agar validasi "required" dieksekusi di service
 * (setelah cek customer), mengikuti urutan business logic pada controller Laravel.
 *---------------------------------------------------------------------- */

export const ShipmentDeliveryInputSchema = z
  .object({
    merchant_id: z.coerce.number().openapi({ example: 1 }),
    item: z
      .object({
        jumlah_pembayaran: z.coerce.number().nullish().openapi({ example: 10000 }),
      })
      .nullish(),
  })
  .openapi("ShipmentDeliveryInput");

export const ShipmentCourierInputSchema = z
  .object({
    merchant_id: z.coerce.number().openapi({ example: 1 }),
    courier: z
      .object({
        name: z.string().nullish().openapi({ example: "JNE" }),
      })
      .nullish(),
    data_courier: z
      .object({
        service: z.union([z.string(), z.number()]).nullish().openapi({ example: "REG" }),
        const: z
          .object({
            value: z.coerce.number().nullish().openapi({ example: 18000 }),
            etd: z.union([z.string(), z.number()]).nullish().openapi({ example: "2-3 Hari" }),
          })
          .nullish(),
      })
      .nullish(),
  })
  .openapi("ShipmentCourierInput");

export const ProductCartNoteInputSchema = z
  .object({
    cart_id: z.coerce.number().openapi({ example: 1 }),
    note: z.string().nullish().openapi({ example: "Tolong dibungkus rapi" }),
  })
  .openapi("ProductCartNoteInput");

export const TransactionV3RequestSchema = z
  .object({
    payment_method: z
      .string()
      .nullish()
      .openapi({ example: "saldo", description: "Alias metode pembayaran" }),
    customer_address: z.coerce
      .number()
      .int()
      .nullish()
      .openapi({ example: 1, description: "ID alamat customer (primary)" }),
    pin: z
      .string()
      .nullish()
      .openapi({ example: "123456", description: "PIN transaksi (wajib untuk pembayaran saldo)" }),
    promo_alias: z.string().nullish().openapi({ example: "promo-ongkir" }),
    vendor: z.string().nullish().openapi({ example: "xendit" }),
    type: z.string().nullish().openapi({ example: "retail" }),
    order_shipment_note: z.string().nullish().openapi({ example: "Tolong dikirim pagi" }),
    order_shipment_delivery: z.array(ShipmentDeliveryInputSchema).nullish(),
    order_shipment_courier: z.array(ShipmentCourierInputSchema).nullish(),
    product_cart_notes: z.array(ProductCartNoteInputSchema).nullish(),
  })
  .openapi("TransactionV3Request");

export const TransactionV3ResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.union([z.string(), z.array(z.string())]).openapi({
      example: "Order berhasil, order anda sedang diproses.",
    }),
    data: z.string().nullish().openapi({ example: "Order berhasil, order anda sedang diproses." }),
    error_code: z.string().nullish().openapi({ example: "0001" }),
    refresh: z.boolean().nullish().openapi({ example: true }),
    dataNotif: z.unknown().nullish(),
    payment: z.unknown().nullish(),
    order: z.unknown().nullish(),
    tutorial: z.unknown().nullish(),
  })
  .openapi("TransactionV3Response");

/* =========================================================================
 * RESPONSE SCHEMAS
 *========================================================================= */

export const StandardOrderResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.union([z.string(), z.array(z.string())]).openapi({ example: "success" }),
    data: z.any().optional().openapi({ example: "Konfirmasi pesanan berhasil" }),
  })
  .openapi("StandardOrderResponse");

export const CancelOrderResponseSchema = StandardOrderResponseSchema.openapi("CancelOrderResponse");
export const FinishOrderResponseSchema = StandardOrderResponseSchema.openapi("FinishOrderResponse");

/* =========================================================================
 * TYPES
 *========================================================================= */

export type NumericValue = number | string | null;

export interface PromoCalculationInput {
  promoTypeValue: string;
  promoValue: NumericValue;
  promoMaxDiscount: NumericValue;
}

export interface OrderPaymentCalculationInput {
  oPaymentSubtotal: NumericValue;
}

// Key adalah merchant ID; isi cart tidak digunakan oleh helper perhitungan.
export type GroupedCart = Readonly<Record<string, readonly unknown[]>>;

// Pertahankan snake_case karena ini adalah struktur input pengiriman,
// bukan hasil query Drizzle.
export interface ShipmentDeliveryInput {
  merchant_id: number | string;
  item?: {
    jumlah_pembayaran?: NumericValue;
  } | null;
}

export interface ShipmentCourierInput {
  merchant_id: number | string;
  courier?: {
    name?: string | null;
  } | null;
  data_courier?: {
    service?: string | number | null;
    const?: {
      value?: NumericValue;
      etd?: string | number | null;
    } | null;
  } | null;
}

export interface ProductCartNoteInput {
  cart_id: number | string;
  note?: string | null;
}

export interface ProductPriceInput {
  productDiscount: NumericValue;
  productPricePublish: NumericValue;
  productPrice: NumericValue;
  productHpp: NumericValue;
}

export interface FlashSalePriceInput {
  fsDetailProductDiscount: NumericValue;
  fsDetailProductNominal: NumericValue;
  fsDetailProductPrice: NumericValue;
}

export interface WholesalePriceInput {
  pPriceQty: NumericValue;
  pPriceNominal: NumericValue;
  pPriceHpp: NumericValue;
}

export interface ProductPriceResult {
  productDiscount: number;
  productPricePublish: number;
  productPrice: number;
  productHpp: number;
  productGrosir: "0" | "1";
}

export interface ProductStockInput {
  productStock: NumericValue;
}

export interface FlashSaleStockInput {
  fsDetailProductStock: NumericValue;
}

export interface VariantStockInput {
  psStock: NumericValue;
}

export type CancelOrderRequest = z.infer<typeof CancelOrderRequestSchema> & {
  customer_id?: string;
  customer_status?: string;
};

export type FinishOrderRequest = z.infer<typeof FinishOrderRequestSchema> & {
  customer_id?: string;
  customer_status?: string;
};

export type TransactionV3Request = z.infer<typeof TransactionV3RequestSchema>;

/** Data auth yang di-inject middleware (setara `$request->get('authData')` Laravel). */
export interface TransactionAuthData {
  customer_id?: number | string;
  customer_name?: string;
  customer_status?: string;
  c_wallet_status?: string;
  sm_key?: string | null;
  [key: string]: unknown;
}

/** Data payment method (subset kolom tabel _payment_method yang dipakai transaksi). */
export interface PaymentMethodData {
  paymentMethodId: number;
  paymentMethodGroup: string | null;
  paymentMethodName: string | null;
  paymentMethodAlias: string;
  paymentMethodDesc: string | null;
  paymentMethod3rdparty: string;
  paymentMethodAdminPrice: NumericValue;
}

/**
 * Parameter `payment_method_request_v2` (mengikuti `$data` / `$param`
 * yang dibangun di `transaction_v3` pada controller Laravel).
 */
export interface PaymentMethodRequestInput {
  vendor?: string | null;
  type?: string | null;
  paymentMethod: PaymentMethodData;
  paymentMethodAlias: string;
  paymentType: string;
  status: string;
  orderPaymentStatus: string;
  subTotal: number;
  orderTotal: number;
  orderShipmentPackage: number;
  orderShipmentNote: string;
}

/** Item cart hasil mapping pengecekan cart & product (langkah `->map()` pada Laravel). */
export interface CheckoutCartItem {
  cartId: number;
  customerId: number;
  merchantId: number;
  productId: number;
  psId: number | null;
  fsDetailId: number | null;
  qty: number;
  note: string | null;
  product: Record<string, unknown> & {
    productId: number;
    productName: string | null;
    productImage1: string | null;
    productWeight: NumericValue;
    ongoing_fs_detail: Record<string, unknown> | null;
    grosir: readonly WholesalePriceInput[];
  };
  merchant: Record<string, unknown>;
  variant: VariantStockInput | null;
  productStock: number;
  productDiscount: number;
  productPricePublish: number;
  productPrice: number;
  productPriceHpp: number;
  productGrosir: "0" | "1";
  productWeight: NumericValue;
  totalAmountHpp: number;
  totalAmount: number;
}

export type GroupedCheckoutCarts = Record<string, CheckoutCartItem[]>;

export type ServiceResponse<T = unknown> = {
  statusCode: ContentfulStatusCode;
  success: boolean;
  message: string | string[];
  data?: T;
};

/** Response `transaction_v3` / `payment_method_request_v2` (bentuk JSON `collect(...)->toJson()`). */
export type TransactionV3Result = {
  statusCode: ContentfulStatusCode;
  success: boolean;
  message: string | string[];
  data?: string | null;
  error_code?: string;
  refresh?: boolean;
  dataNotif?: unknown;
  payment?: unknown;
  order?: unknown;
  tutorial?: unknown;
};
