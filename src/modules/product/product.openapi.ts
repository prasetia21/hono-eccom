import { HTTP_STATUS } from "@/shared/constants/http-status";
import type { OpenAPITagDefinition } from "@/shared/types/openapi";
import { z } from "@hono/zod-openapi";
import { createStandardPostRoute, errBadRequest, errNotFound } from "@/shared/utils/openapi-helper";
import {
  ProductByCategoryRequestSchema,
  ProductByCategoryResponseSchema,
  CategoryRecommendResponseSchema,
  ProductCatMostViewRequestSchema,
  ProductCatMostViewResponseSchema,
} from "./product.dto";

/* =========================================================================
 * TAG
 *========================================================================= */

export const productTag: OpenAPITagDefinition = {
  name: "Product",
  description: "Endpoint untuk produk ecommerce",
};

const TAGS = [productTag.name];

/* =========================================================================
 * ROUTES
 *========================================================================= */

/** POST /ecommerce/product_by_cat */
export const productByCategoryRoute = createStandardPostRoute({
  path: "/product_by_cat",
  tags: TAGS,
  summary: "Product By Category",
  description:
    "Mendapatkan daftar produk berdasarkan kategori dengan filter harga, kondisi, dan pengurutan.",
  reqSchema: ProductByCategoryRequestSchema,
  reqRequired: false,
  resSchema: ProductByCategoryResponseSchema,
  resDescription: "Berhasil mendapatkan data produk",
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
  resSchema: CategoryRecommendResponseSchema,
  resDescription: "Berhasil mendapatkan data rekomendasi kategori",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
  },
});

/** POST /ecommerce/product_cat_most_view */
export const productCatMostViewRoute = createStandardPostRoute({
  path: "/product_cat_most_view",
  tags: TAGS,
  summary: "Product Category Most View",
  description:
    "Mendapatkan daftar produk berdasarkan alias kategori dengan filter harga, kondisi, kata kunci, dan pengurutan. Default sort: p_point_total DESC.",
  reqSchema: ProductCatMostViewRequestSchema,
  reqRequired: true,
  resSchema: ProductCatMostViewResponseSchema,
  resDescription: "Berhasil mendapatkan data produk berdasarkan kategori",
  withSessionToken: true,
  errors: {
    [HTTP_STATUS.UNAUTHORIZED]: errBadRequest("Token tidak valid"),
    [HTTP_STATUS.BAD_REQUEST]: errBadRequest("Validasi gagal"),
    [HTTP_STATUS.NOT_FOUND]: errNotFound("Kategori tidak ditemukan"),
  },
});
