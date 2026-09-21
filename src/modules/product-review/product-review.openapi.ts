import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { createStandardPostRoute, errBadRequest, errNotFound } from "@/shared/utils/openapi-helper";
import {
  AddReviewRequestSchema,
  AddReviewResponseSchema,
  GetProductReviewRequestSchema,
  GetProductReviewResponseSchema,
  ReportReviewRequestSchema,
  ReportReviewResponseSchema,
} from "./product-review.dto";

/* =========================================================================
 * TAG
 *========================================================================= */

export const productReviewTag: OpenAPITagDefinition = {
  name: "Product Review",
  description: "Endpoint untuk review produk ecommerce",
};

const TAGS = [productReviewTag.name];

/* =========================================================================
 * ROUTES
 *========================================================================= */

/** POST /ecommerce/review/add_review */
export const addReviewRoute = createStandardPostRoute({
  path: "/review/add_review",
  tags: TAGS,
  summary: "Add Review",
  description:
    "Menyimpan review produk dari customer yang sudah login (middleware auth), lalu menambahkan product point 'rating'.",
  reqSchema: AddReviewRequestSchema,
  reqRequired: false,
  resSchema: AddReviewResponseSchema,
  resDescription: "Berhasil menyimpan review produk",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
    [HTTP_STATUS.NOT_FOUND]: errNotFound("Data tidak ditemukan"),
  },
});

/** POST /ecommerce/review/get_product_review */
export const getProductReviewRoute = createStandardPostRoute({
  path: "/review/get_product_review",
  tags: TAGS,
  summary: "Get Product Review",
  description:
    "Mendapatkan daftar review produk beserta data customer (customer_id, customer_name, customer_image), dengan filter rating dan pagination.",
  reqSchema: GetProductReviewRequestSchema,
  reqRequired: false,
  resSchema: GetProductReviewResponseSchema,
  resDescription: "Berhasil mendapatkan data review produk",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
    [HTTP_STATUS.NOT_FOUND]: errNotFound("Data tidak ditemukan"),
  },
});

/** POST /ecommerce/review/report_review */
export const reportReviewRoute = createStandardPostRoute({
  path: "/review/report_review",
  tags: TAGS,
  summary: "Report Review",
  description:
    "Melaporkan review produk yang tidak pantas (middleware authOpt, customer_id default 0 jika tidak login).",
  reqSchema: ReportReviewRequestSchema,
  reqRequired: false,
  resSchema: ReportReviewResponseSchema,
  resDescription: "Berhasil menyimpan laporan review",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
    [HTTP_STATUS.NOT_FOUND]: errNotFound("Data tidak ditemukan"),
  },
});
