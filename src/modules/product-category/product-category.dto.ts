import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/* =========================================================================
 * REQUEST SCHEMAS
 *========================================================================= */

export const ProductCategoryByIdRequestSchema = z
  .object({
    cat_id: z.coerce.string().openapi({
      example: "1",
      description: "ID kategori produk",
    }),
  })
  .openapi("ProductCategoryByIdRequest");

/* =========================================================================
 * BASE SCHEMAS
 *========================================================================= */

export const ProductCategoryItemSchema = z
  .object({
    cat_id: z.number(),
    cat_name: z.string(),
    cat_alias: z.string(),
    cat_desc: z.string(),
    cat_image: z.string(),
    cat_hits: z.number(),
    cat_parent: z.number(),
    cat_level: z.number(),
    cat_status: z.string(),
    cat_root: z.string(),
    cat_order: z.number(),
    is_option_required: z.string(),
    cat_shipment_margin: z.string(),
    cat_pickup_margin: z.string(),
    cat_favorite: z.string().nullable().optional(),
    cat_platform: z.string().nullable().optional(),
  })
  .passthrough();

/* =========================================================================
 * OPENAPI RESPONSE SCHEMAS
 *========================================================================= */

const ProductCategoryByIdSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: ProductCategoryItemSchema,
});

const ProductCategoryFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const ProductCategoryByIdResponseSchema = z
  .union([ProductCategoryByIdSuccessSchema, ProductCategoryFailureSchema])
  .openapi("ProductCategoryByIdResponse");

/* =========================================================================
 * TYPES
 *========================================================================= */

export type ProductCategoryByIdRequest = z.infer<typeof ProductCategoryByIdRequestSchema>;
export type ProductCategoryByIdResponse = z.infer<typeof ProductCategoryByIdResponseSchema>;
export type ProductCategoryByIdServiceResult = ProductCategoryByIdResponse & {
  statusCode: ContentfulStatusCode;
};

export type ProductCategoryItem = z.infer<typeof ProductCategoryItemSchema>;

/* =========================================================================
 * CATEGORY RECOMMEND
 *========================================================================= */

export const ProductCategoryRecommendItemSchema = z
  .object({
    pc_recommend_id: z.number(),
    cat_id: z.number(),
    pc_order_key: z.number(),
    pc_recommend_image: z.string().nullable().optional(),
    pc_recommend_status: z.string().nullable().optional(),
    pc_recommend_create_date: z.string().nullable().optional(),
    pc_recommend_update_date: z.string().nullable().optional(),
    category: ProductCategoryItemSchema.extend({
      product: z.array(z.object({}).passthrough()),
    })
      .nullable()
      .optional(),
  })
  .passthrough();

const ProductCategoryRecommendSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(ProductCategoryRecommendItemSchema),
});

const ProductCategoryRecommendFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const ProductCategoryRecommendResponseSchema = z
  .union([ProductCategoryRecommendSuccessSchema, ProductCategoryRecommendFailureSchema])
  .openapi("ProductCategoryRecommendResponse");

export type ProductCategoryRecommendResponse = z.infer<
  typeof ProductCategoryRecommendResponseSchema
>;
export type ProductCategoryRecommendServiceResult = ProductCategoryRecommendResponse & {
  statusCode: ContentfulStatusCode;
};
