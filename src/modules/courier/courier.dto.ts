import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/* =========================================================================
 * REQUEST SCHEMAS
 *========================================================================= */

export const DeliveryPriceV2RequestSchema = z
  .object({
    c_address_id: z.coerce.number().openapi({
      example: 1,
      description: "ID alamat penerima (customer address)",
    }),
    merchant_id: z.coerce.number().openapi({
      example: 1,
      description: "ID merchant pengirim",
    }),
    customer_id: z.coerce.string().optional().openapi({
      example: "1",
      description: "ID customer (dari auth)",
    }),
  })
  .openapi("DeliveryPriceV2Request");

/* =========================================================================
 * RESPONSE SCHEMAS
 *========================================================================= */

const RajaOngkirCitySchema = z
  .object({
    r_city_id: z.number().nullable().optional(),
    province_id: z.number().nullable().optional(),
    city_id: z.number().nullable().optional(),
    subdistrict_id: z.number().nullable().optional(),
    r_city_province: z.string().nullable().optional(),
    r_city_name: z.string().nullable().optional(),
    r_city_subdistrict: z.string().nullable().optional(),
    r_city_postcode: z.string().nullable().optional(),
  })
  .passthrough();

const DeliveryPriceV2SuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  detail_pengirim: RajaOngkirCitySchema.nullable(),
  detail_penerima: RajaOngkirCitySchema.nullable(),
  jumlah_pembayaran: z.number(),
  cod: z.union([z.string(), z.number()]),
});

const DeliveryPriceV2FailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const DeliveryPriceV2ResponseSchema = z
  .union([DeliveryPriceV2SuccessSchema, DeliveryPriceV2FailureSchema])
  .openapi("DeliveryPriceV2Response");

/* =========================================================================
 * TYPES
 *========================================================================= */

export type DeliveryPriceV2Request = z.infer<typeof DeliveryPriceV2RequestSchema>;
export type DeliveryPriceV2Response = z.infer<typeof DeliveryPriceV2ResponseSchema>;
export type DeliveryPriceV2ServiceResult = DeliveryPriceV2Response & {
  statusCode: ContentfulStatusCode;
};
