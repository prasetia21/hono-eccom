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
  data_courier?: {
    const?: {
      value?: NumericValue;
    } | null;
  } | null;
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

export type ServiceResponse<T = unknown> = {
  statusCode: ContentfulStatusCode;
  success: boolean;
  message: string | string[];
  data?: T;
};
