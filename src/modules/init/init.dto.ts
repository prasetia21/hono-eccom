import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/* =========================================================================
 * REQUEST SCHEMAS
 *========================================================================= */

export const GetChildCategoryRequestSchema = z
  .object({
    cat_parent: z.string().optional().openapi({
      example: "1",
      description: "ID kategori induk untuk mendapatkan child category",
    }),
  })
  .openapi("GetChildCategoryRequest");

/* =========================================================================
 * BASE SCHEMAS
 *========================================================================= */

export const CategoryItemSchema = z.object({
  cat_id: z.number(),
  cat_name: z.string(),
  cat_alias: z.string(),
  cat_desc: z.string().optional(),
  cat_image: z.string(),
  cat_hits: z.number(),
  cat_parent: z.number(),
  cat_level: z.number(),
  cat_status: z.string(),
  cat_root: z.string().optional(),
  cat_order: z.number(),
  is_option_required: z.string(),
  cat_shipment_margin: z.string(),
  cat_pickup_margin: z.string(),
  cat_favorite: z.string(),
  cat_platform: z.string(),
  child: z
    .array(
      z.object({
        cat_id: z.number(),
        cat_name: z.string(),
        cat_alias: z.string(),
        cat_desc: z.string().optional(),
        cat_image: z.string(),
        cat_hits: z.number(),
        cat_parent: z.number(),
        cat_level: z.number(),
        cat_status: z.string(),
        cat_root: z.string().optional(),
        cat_order: z.number(),
        is_option_required: z.string(),
        cat_shipment_margin: z.string(),
        cat_pickup_margin: z.string(),
        cat_favorite: z.string(),
        cat_platform: z.string(),
      }),
    )
    .optional(),
});

/* =========================================================================
 * OPENAPI RESPONSE SCHEMAS
 *========================================================================= */

const GetChildCategorySuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(CategoryItemSchema),
});

const CategoryFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const GetChildCategoryResponseSchema = z
  .union([GetChildCategorySuccessSchema, CategoryFailureSchema])
  .openapi("GetChildCategoryResponse");

/* =========================================================================
 * TYPES
 *========================================================================= */

export type GetChildCategoryRequest = z.infer<typeof GetChildCategoryRequestSchema>;
export type GetChildCategoryResponse = z.infer<typeof GetChildCategoryResponseSchema>;
export type GetChildCategoryServiceResult = GetChildCategoryResponse & {
  statusCode: ContentfulStatusCode;
};
