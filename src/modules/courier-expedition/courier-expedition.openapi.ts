import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { createStandardPostRoute, errBadRequest } from "@/shared/utils/openapi-helper";
import { CourierPriceRequestSchema, CourierPriceResponseSchema } from "./courier-expedition.dto.ts";

/* =========================================================================
 * TAG
 *========================================================================= */

export const courierExpeditionTag: OpenAPITagDefinition = {
  name: "Courier",
  description: "Endpoint untuk pengecekan ongkos kirim dan ketersediaan kurir",
};

const TAGS = [courierExpeditionTag.name];

/* =========================================================================
 * ROUTES
 *========================================================================= */

/** POST /delive_price_v2 */
export const courierExpeditionPriceRoute = createStandardPostRoute({
  path: "/",
  tags: TAGS,
  summary: "Courier Price",
  description: "Menghitung estimasi harga ongkos kirim dan ketersediaan kurir ekpedisi",
  reqSchema: CourierPriceRequestSchema,
  reqRequired: true,
  resSchema: CourierPriceResponseSchema,
  resDescription: "Berhasil mendapatkan data kurir ekpedisi",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});
