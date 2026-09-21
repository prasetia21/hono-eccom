import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { createStandardPostRoute, errBadRequest } from "@/shared/utils/openapi-helper"; // Atau createStandardGetRoute jika endpoint-nya GET
import {
  GetPaymentMethodRequestSchema,
  GetPaymentMethodResponseSchema,
} from "./payment-method.dto";

/* =========================================================================
 * TAG
 *========================================================================= */

export const paymentTag: OpenAPITagDefinition = {
  name: "Payment Method",
  description: "Endpoint untuk mendapatkan daftar metode pembayaran aktif",
};

const TAGS = [paymentTag.name];

/* =========================================================================
 * ROUTE
 *========================================================================= */

/** POST /ecommerce/payment_method */
export const getPaymentMethodRoute = createStandardPostRoute({
  path: "/payment-method",
  tags: TAGS,
  summary: "Get Payment Method",
  description: "Mendapatkan daftar metode pembayaran yang aktif.",
  reqSchema: GetPaymentMethodRequestSchema,
  reqRequired: false,
  resSchema: GetPaymentMethodResponseSchema,
  resDescription: "Berhasil mendapatkan data metode pembayaran",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});
