import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/* =========================================================================
 * REQUEST SCHEMAS
 *========================================================================= */

export const GetPaymentMethodRequestSchema = z.object({}).openapi("GetPaymentMethodRequest");

/* =========================================================================
 * BASE SCHEMAS
 *========================================================================= */

export const PaymentMethodItemSchema = z.object({
  payment_method_id: z.number(),
  payment_method_admin_price: z.string(),
  payment_method_group: z.string(),
  payment_method_name: z.string(),
  payment_method_alias: z.string(),
  payment_method_status: z.string(),
  payment_method_3rdparty: z.string(),
  payment_method_logo: z.string(),
});

/* =========================================================================
 * OPENAPI RESPONSE SCHEMAS
 *========================================================================= */

const GetPaymentMethodSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(PaymentMethodItemSchema),
});

const PaymentMethodFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const GetPaymentMethodResponseSchema = z
  .union([GetPaymentMethodSuccessSchema, PaymentMethodFailureSchema])
  .openapi("GetPaymentMethodResponse");

/* =========================================================================
 * TYPES
 *========================================================================= */

export type GetPaymentMethodRequest = z.infer<typeof GetPaymentMethodRequestSchema>;
export type GetPaymentMethodResponse = z.infer<typeof GetPaymentMethodResponseSchema>;
export type GetPaymentMethodServiceResult = GetPaymentMethodResponse & {
  statusCode: ContentfulStatusCode;
};
