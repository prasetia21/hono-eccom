import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { PaginationSchema } from "@/shared/schemas/base.schema";

/* =========================================================================
 * REQUEST SCHEMAS
 *========================================================================= */

export const GetHistoryOrderRequestSchema = z
  .object({
    status: z.string().optional().openapi({
      example: "finish",
      description: "Filter status order (new, paid, process, pickup, finish, cancel, refund)",
    }),
    customer_id: z.coerce.string().optional().openapi({
      example: "1",
      description: "ID customer (dari auth)",
    }),
    page: z.coerce.number().optional().default(1).openapi({
      example: 1,
      description: "Halaman pagination",
    }),
    limit: z.coerce.number().optional().default(20).openapi({
      example: 20,
      description: "Limit item per halaman",
    }),
  })
  .openapi("GetHistoryOrderRequest");

/* =========================================================================
 * RESPONSE SCHEMAS (RELATIONAL)
 *========================================================================= */

const ProductReviewMiniSchema = z
  .object({
    review_id: z.number(),
    customer_id: z.number().nullable().optional(),
    product_id: z.number().nullable().optional(),
  })
  .passthrough();

const ProductStockMiniSchema = z
  .object({
    ps_id: z.number(),
    ps_option: z.string().nullable().optional(),
  })
  .passthrough();

const ProductMiniSchema = z
  .object({
    product_id: z.number(),
    product_name: z.string(),
    product_price: z.number().nullable().optional(),
  })
  .passthrough();

const OrderDetailItemSchema = z
  .object({
    o_detail_id: z.number(),
    order_id: z.number().nullable().optional(),
    product_id: z.number().nullable().optional(),
    ps_id: z.number().nullable().optional(),
    qty: z.coerce.number().nullable().optional(),
    product_review: z.array(ProductReviewMiniSchema).nullable().optional(),
    product_stock: ProductStockMiniSchema.nullable().optional(),
    product: ProductMiniSchema.nullable().optional(),
  })
  .passthrough();

const OrderCashbackMiniSchema = z
  .object({
    o_payment_id: z.number().nullable().optional(),
    o_cashback_nominal: z.number().nullable().optional(),
    o_cashback_status: z.string().nullable().optional(),
  })
  .passthrough();

const OrderPaymentMiniSchema = z
  .object({
    o_payment_id: z.number(),
    o_payment_total: z.number().nullable().optional(),
    o_payment_status: z.string().nullable().optional(),
    order_cashback: OrderCashbackMiniSchema.nullable().optional(),
  })
  .passthrough();

const CustomerMiniSchema = z
  .object({
    customer_id: z.number(),
    customer_name: z.string().nullable().optional(),
    customer_email: z.string().nullable().optional(),
  })
  .passthrough();

const MerchantMiniSchema = z
  .object({
    merchant_id: z.number(),
    merchant_name: z.string().nullable().optional(),
  })
  .passthrough();

const MessageEcommerceMiniSchema = z
  .object({
    m_ecommerce_id: z.number(),
    customer_id: z.number().nullable().optional(),
    m_ecommerce_status: z.string().nullable().optional(),
  })
  .passthrough();

const HistoryOrderItemSchema = z
  .object({
    order_id: z.number(),
    order_number: z.string().nullable().optional(),
    o_payment_id: z.number().nullable().optional(),
    customer_id: z.number().nullable().optional(),
    merchant_id: z.number().nullable().optional(),
    order_shipment_type: z.string().nullable().optional(),
    order_payment_type: z.string().nullable().optional(),
    order_subtotal: z.number().nullable().optional(),
    order_tax: z.number().nullable().optional(),
    order_discount_price: z.number().nullable().optional(),
    order_shipment_price: z.number().nullable().optional(),
    order_total: z.number().nullable().optional(),
    order_status: z.string().nullable().optional(),
    order_create_date: z.string().nullable().optional(),
    order_detail: z.array(OrderDetailItemSchema).nullable().optional(),
    order_payment: OrderPaymentMiniSchema.nullable().optional(),
    customer: CustomerMiniSchema.nullable().optional(),
    merchant: MerchantMiniSchema.nullable().optional(),
    message_ecommerce: MessageEcommerceMiniSchema.nullable().optional(),
  })
  .passthrough();

const GetHistoryOrderSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: PaginationSchema(HistoryOrderItemSchema),
});

const GetHistoryOrderFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const GetHistoryOrderResponseSchema = z
  .union([GetHistoryOrderSuccessSchema, GetHistoryOrderFailureSchema])
  .openapi("GetHistoryOrderResponse");

/* =========================================================================
 * TYPES
 *========================================================================= */

export type GetHistoryOrderRequest = z.infer<typeof GetHistoryOrderRequestSchema>;
export type GetHistoryOrderResponse = z.infer<typeof GetHistoryOrderResponseSchema>;
export type GetHistoryOrderServiceResult = GetHistoryOrderResponse & {
  statusCode: ContentfulStatusCode;
};

/* =========================================================================
 * SHIPPING TRACKING SCHEMAS
 *========================================================================= */

export const GetShippingTrackingRequestSchema = z
  .object({
    order_number: z.string().openapi({
      example: "ORD-20240101-0001",
      description: "Nomor order yang ingin dilacak",
    }),
    customer_id: z.coerce.string().optional().openapi({
      example: "1",
      description: "ID customer (diisi otomatis oleh middleware auth)",
    }),
  })
  .openapi("GetShippingTrackingRequest");

export const TrackingHistoryItemSchema = z
  .object({
    tracking_id: z.number(),
    order_id: z.number(),
    tracking_title: z.string(),
    tracking_desc: z.string().nullable().optional(),
    tracking_date: z.string().nullable().optional(),
    tracking_status: z.string().nullable().optional(),
    tracking_create_date: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi("TrackingHistoryItem");

export const ShippingTrackingDataSchema = z
  .object({
    Waybill_number: z.string().nullable().optional(),
    Courier: z.string().nullable().optional(),
    Service: z.string().nullable().optional(),
    Sender: z.string().nullable().optional(),
    Sender_address: z.string().nullable().optional(),
    Receiver_address: z.string().nullable().optional(),
    Receiver_name: z.string().nullable().optional(),
    Track_history: z.array(TrackingHistoryItemSchema),
    Last_status: TrackingHistoryItemSchema.nullable().optional(),
  })
  .openapi("ShippingTrackingData");

const GetShippingTrackingSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: ShippingTrackingDataSchema,
});

const GetShippingTrackingFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const GetShippingTrackingResponseSchema = z
  .union([GetShippingTrackingSuccessSchema, GetShippingTrackingFailureSchema])
  .openapi("GetShippingTrackingResponse");

export type GetShippingTrackingRequest = z.infer<typeof GetShippingTrackingRequestSchema>;
export type GetShippingTrackingResponse = z.infer<typeof GetShippingTrackingResponseSchema>;
export type GetShippingTrackingServiceResult = GetShippingTrackingResponse & {
  statusCode: ContentfulStatusCode;
};
