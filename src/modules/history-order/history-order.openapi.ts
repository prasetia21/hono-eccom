import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { createStandardPostRoute, errBadRequest } from "@/shared/utils/openapi-helper";
import {
  GetHistoryOrderRequestSchema,
  GetHistoryOrderResponseSchema,
  GetShippingTrackingRequestSchema,
  GetShippingTrackingResponseSchema,
} from "./history-order.dto";

/* =========================================================================
 * TAG
 *========================================================================= */

export const historyOrderTag: OpenAPITagDefinition = {
  name: "History Order",
  description: "Endpoint untuk melihat riwayat order customer",
};

const TAGS = [historyOrderTag.name];

/* =========================================================================
 * ROUTES
 *========================================================================= */

/** POST /history/order */
export const getHistoryOrderRoute = createStandardPostRoute({
  path: "/order",
  tags: TAGS,
  summary: "Get History Order",
  description: "Mendapatkan daftar riwayat transaksi/order yang pernah dilakukan oleh customer.",
  reqSchema: GetHistoryOrderRequestSchema,
  reqRequired: false,
  resSchema: GetHistoryOrderResponseSchema,
  resDescription: "Berhasil mendapatkan riwayat order",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});

/** POST /history/order/shipping_tracking */
export const getShippingTrackingRoute = createStandardPostRoute({
  path: "/order/shipping_tracking",
  tags: TAGS,
  summary: "Get Shipping Tracking",
  description:
    "Mendapatkan data pelacakan pengiriman kurir (resi, kurir, histori status pengiriman) berdasarkan order_number.",
  reqSchema: GetShippingTrackingRequestSchema,
  reqRequired: true,
  resSchema: GetShippingTrackingResponseSchema,
  resDescription: "Berhasil mendapatkan data pelacakan pengiriman",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});
