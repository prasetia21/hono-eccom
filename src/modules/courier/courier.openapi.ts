import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { createStandardPostRoute, errBadRequest } from "@/shared/utils/openapi-helper";
import { DeliveryPriceV2RequestSchema, DeliveryPriceV2ResponseSchema } from "./courier.dto";

/* =========================================================================
 * TAG
 *========================================================================= */

export const courierTag: OpenAPITagDefinition = {
  name: "Courier",
  description: "Endpoint untuk pengecekan ongkos kirim dan ketersediaan kurir",
};

const TAGS = [courierTag.name];

/* =========================================================================
 * ROUTES
 *========================================================================= */

/** POST /delivery/delive_v2 */
export const deliveryPriceV2Route = createStandardPostRoute({
  path: "/delive_v2",
  tags: TAGS,
  summary: "Delivery Price V2",
  description:
    "Menghitung ongkos kirim berdasarkan keranjang belanja customer ke merchant tertentu dan alamat tujuan penerima. Berat dihitung dari total produk di keranjang dengan pembulatan ke atas per 0.5 kg.",
  reqSchema: DeliveryPriceV2RequestSchema,
  reqRequired: true,
  resSchema: DeliveryPriceV2ResponseSchema,
  resDescription: "Berhasil menghitung ongkos kirim",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});
