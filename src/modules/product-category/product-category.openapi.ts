import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { z } from "@hono/zod-openapi";
import { createStandardPostRoute, errBadRequest, errNotFound } from "@/shared/utils/openapi-helper";
import {
  ProductCategoryByIdRequestSchema,
  ProductCategoryByIdResponseSchema,
  ProductCategoryRecommendResponseSchema,
} from "./product-category.dto";

/* =========================================================================
 * TAG
 *========================================================================= */

export const productCategoryTag: OpenAPITagDefinition = {
  name: "Product Category",
  description: "Endpoint untuk kategori produk ecommerce",
};

const TAGS = [productCategoryTag.name];

/* =========================================================================
 * ROUTES
 *========================================================================= */

/** POST /ecommerce/product_category_by_id */
export const productCategoryByIdRoute = createStandardPostRoute({
  path: "/product_category_by_id",
  tags: TAGS,
  summary: "Product Category By ID",
  description: "Mendapatkan data kategori produk berdasarkan cat_id.",
  reqSchema: ProductCategoryByIdRequestSchema,
  reqRequired: true,
  resSchema: ProductCategoryByIdResponseSchema,
  resDescription: "Berhasil mendapatkan data kategori produk",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
    [HTTP_STATUS.NOT_FOUND]: errNotFound("Data tidak ditemukan"),
  },
});

/** POST /ecommerce/category_recommend */
export const productCategoryRecommendRoute = createStandardPostRoute({
  path: "/category_recommend",
  tags: TAGS,
  summary: "Category Recommendation",
  description:
    "Mendapatkan daftar rekomendasi kategori produk beserta produk-produk aktif di dalamnya.",
  reqSchema: z.object({}).openapi("ProductCategoryRecommendRequest"),
  reqRequired: false,
  resSchema: ProductCategoryRecommendResponseSchema,
  resDescription: "Berhasil mendapatkan data rekomendasi kategori",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});
