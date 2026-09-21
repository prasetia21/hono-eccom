import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { createStandardPostRoute, errBadRequest } from "@/shared/utils/openapi-helper";
import {
  CancelOrderRequestSchema,
  CancelOrderResponseSchema,
  FinishOrderRequestSchema,
  FinishOrderResponseSchema,
} from "./order.dto.ts";

export const orderTag: OpenAPITagDefinition = {
  name: "Order",
  description: "Endpoint untuk konfirmasi dan pembatalan pesanan",
};

const TAGS = [orderTag.name];

const AUTH_ERRORS = {
  [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
  [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
};

/** POST /order/finish */
export const finishOrderRoute = createStandardPostRoute({
  path: "/finish",
  tags: TAGS,
  summary: "Finish Order",
  description: "Konfirmasi pesanan diterima (status pickup → finish)",
  reqSchema: FinishOrderRequestSchema,
  reqRequired: true,
  resSchema: FinishOrderResponseSchema,
  resDescription: "Berhasil konfirmasi pesanan",
  withSessionToken: true,
  errors: AUTH_ERRORS,
});

/** POST /order/cancel */
export const cancelOrderRoute = createStandardPostRoute({
  path: "/cancel",
  tags: TAGS,
  summary: "Cancel Order",
  description: "Membatalkan pesanan customer dan mengembalikan stok produk",
  reqSchema: CancelOrderRequestSchema,
  reqRequired: true,
  resSchema: CancelOrderResponseSchema,
  resDescription: "Berhasil membatalkan pesanan",
  withSessionToken: true,
  errors: AUTH_ERRORS,
});
