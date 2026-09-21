import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { RajaOngkirCitySchema } from "@/shared/schemas/base.schema.ts";

/* =========================================================================
 * REQUEST SCHEMAS
 *========================================================================= */

export const CourierPriceRequestSchema = z
  .object({
    merchant_id: z.coerce.number().int().min(1, "Merchant ID is required").openapi({
      example: 1,
      description: "ID merchant pengirim",
    }),
  })
  .openapi("CourierPriceRequest");

/* =========================================================================
 * RESPONSE SCHEMAS
 *========================================================================= */

export const CourierCostItemSchema = z
  .object({
    code: z.string().openapi({
      example: "sicepat",
      description: "Kode grup ekspedisi",
    }),
    name: z.string().openapi({
      example: "SiCepat",
      description: "Nama ekspedisi",
    }),
    costs: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).openapi({
      description:
        "Hasil parse tarif kurir (mengikuti parse_response Laravel: sicepat/jnt/anteraja/idexpress)",
    }),
  })
  .openapi("CourierCostItem");

const CourierPriceSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string().openapi({ example: "Data berhasil ditemukan" }),
  origin_details: RajaOngkirCitySchema.nullable(),
  destination_details: RajaOngkirCitySchema.nullable(),
  results: z.array(CourierCostItemSchema),
});

const CourierPriceFailureSchema = z.object({
  success: z.literal(false),
  message: z.string().openapi({
    example: "alamat tidak ditemukan",
    description:
      "Pesan error bisnis: alamat tidak ditemukan | alamat toko tidak ditemukan | cart tidak ditemukan | Data tidak ditemukan",
  }),
});

export const CourierPriceResponseSchema = z
  .union([CourierPriceSuccessSchema, CourierPriceFailureSchema])
  .openapi("CourierPriceResponse");

/* =========================================================================
 * TYPES
 *========================================================================= */
export type CourierCostItem = {
  code: string;
  name: string;
  costs: Record<string, unknown> | unknown[];
};

export type CourierCode = "sicepat" | "anteraja" | "jnt" | "idexpress";

export type CourierReq = {
  courier: CourierCode;
  name: string;
  origin: string | number;
  destination: string | number;
  weight: number; // sicepat/jnt/idexpress: kg, anteraja: gram
};

export type ShipmentCostData = Record<string, unknown> | unknown[] | null;

export type ShipmentCostResponse = {
  success: boolean;
  message: string;
  data?: ShipmentCostData;
  isError?: boolean;
};

export type CourierPriceRequest = z.infer<typeof CourierPriceRequestSchema> & {
  customer_id?: string | number;
};

export type CourierPriceResponse = z.infer<typeof CourierPriceResponseSchema>;

export type CourierPriceServiceResult = CourierPriceResponse & {
  statusCode: ContentfulStatusCode;
};

export type EnabledExpedisiMap = Record<string, string>;

export type CourierCityDetails = z.infer<typeof RajaOngkirCitySchema> | null;

export type DestinationAddress = {
  c_address_id: number;
  customer_id: number;
  r_city_id: number | null;
  c_address_latitude: string | null;
  c_address_longitude: string | null;
  city: CourierCityDetails;
  sicepat?: { sc_sicepat_code: string | null };
  anteraja?: { sc_anteraja_code: string | null };
  jnt?: { sc_jnt_city: string | null; sc_jnt_subdistrict: string | null };
  idexpress?: {
    sc_idexpress_district_code: number | null;
    sc_idexpress_city_code: number | null;
  };
};

export type OriginAddress = {
  merchant_id: number;
  customer_id: number | null;
  r_city_id: number | null;
  address_primary: {
    c_address_latitude: string | null;
    c_address_longitude: string | null;
    r_city_id: number | null;
  } | null;
  city: CourierCityDetails;
  sicepat: { sc_sicepat_code: string | null } | null;
  anteraja: { sc_anteraja_code: string | null } | null;
  jnt: { sc_jnt_city: string | null } | null;
  idexpress: { sc_idexpress_city_code: number | null } | null;
};
