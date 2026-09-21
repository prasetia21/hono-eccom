import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { PaginationSchema } from "@/shared/schemas/base.schema";

/* =========================================================================
 * REQUEST SCHEMAS
 *========================================================================= */

export const AddReviewRequestSchema = z
  .object({
    product_id: z.coerce.number().optional().openapi({
      example: 933,
      description: "ID produk yang direview",
    }),
    review_title: z.string().optional().openapi({
      example: "Barang bagus",
      description: "Judul review",
    }),
    review_desc: z.string().optional().openapi({
      example: "Barang sesuai deskripsi, pengiriman cepat",
      description: "Deskripsi review",
    }),
    rating: z.coerce.number().optional().openapi({
      example: 5,
      description: "Rating produk (1-5)",
    }),
    customer_id: z.coerce.number().optional().openapi({
      example: 1,
      description: "ID customer (dari auth)",
    }),
  })
  .openapi("AddReviewRequest");

export const GetProductReviewRequestSchema = z
  .object({
    product_id: z.coerce.number().optional().openapi({
      example: 933,
      description: "ID produk",
    }),
    rating: z.coerce.number().optional().openapi({
      example: 5,
      description: "Filter rating (0 / kosong = semua rating)",
    }),
    page: z.coerce.number().optional().default(1).openapi({
      example: 1,
      description: "Halaman untuk pagination",
    }),
    limit: z.coerce.number().optional().default(10).openapi({
      example: 10,
      description: "Jumlah item per halaman (Laravel: paginate(10))",
    }),
  })
  .openapi("GetProductReviewRequest");

export const ReportReviewRequestSchema = z
  .object({
    review_id: z.coerce.number().optional().openapi({
      example: 12,
      description: "ID review yang dilaporkan",
    }),
    review_reason: z.string().optional().openapi({
      example: "Review mengandung konten tidak pantas",
      description: "Alasan laporan review",
    }),
    customer_id: z.coerce.number().optional().openapi({
      example: 1,
      description: "ID customer (dari auth, opsional)",
    }),
  })
  .openapi("ReportReviewRequest");

/* =========================================================================
 * BASE SCHEMAS
 *========================================================================= */

export const CustomerBriefSchema = z
  .object({
    customer_id: z.number(),
    customer_name: z.string().nullable().optional(),
    customer_image: z.string().nullable().optional(),
  })
  .passthrough();

export const ProductReviewItemSchema = z
  .object({
    review_id: z.number(),
    customer_id: z.number().nullable().optional(),
    product_id: z.number().nullable().optional(),
    review_title: z.string().nullable().optional(),
    review_desc: z.string().nullable().optional(),
    rating: z.number().nullable().optional(),
    review_create_date: z.string().nullable().optional(),
    review_image: z.string().nullable().optional(),
  })
  .passthrough();

export const ProductReviewWithCustomerSchema = ProductReviewItemSchema.extend({
  customer: CustomerBriefSchema.nullable().optional(),
});

export const ProductReviewReportSchema = z
  .object({
    r_report_id: z.number(),
    review_id: z.number().nullable().optional(),
    customer_id: z.number().nullable().optional(),
    r_report_reason: z.string().nullable().optional(),
    r_report_create_date: z.string().nullable().optional(),
  })
  .passthrough();

/* =========================================================================
 * PAGINATION SCHEMAS
 *========================================================================= */

export const PaginatedProductReviewSchema = PaginationSchema(ProductReviewWithCustomerSchema);

/* =========================================================================
 * OPENAPI RESPONSE SCHEMAS
 *========================================================================= */

const AddReviewSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: ProductReviewItemSchema,
});

const GetProductReviewSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: PaginatedProductReviewSchema,
});

const ReportReviewSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: ProductReviewReportSchema,
});

const ProductReviewFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const AddReviewResponseSchema = z
  .union([AddReviewSuccessSchema, ProductReviewFailureSchema])
  .openapi("AddReviewResponse");

export const GetProductReviewResponseSchema = z
  .union([GetProductReviewSuccessSchema, ProductReviewFailureSchema])
  .openapi("GetProductReviewResponse");

export const ReportReviewResponseSchema = z
  .union([ReportReviewSuccessSchema, ProductReviewFailureSchema])
  .openapi("ReportReviewResponse");

/* =========================================================================
 * TYPES
 *========================================================================= */

export type AddReviewRequest = z.infer<typeof AddReviewRequestSchema>;
export type GetProductReviewRequest = z.infer<typeof GetProductReviewRequestSchema>;
export type ReportReviewRequest = z.infer<typeof ReportReviewRequestSchema>;

export type ProductReviewItem = z.infer<typeof ProductReviewItemSchema>;
export type ProductReviewWithCustomer = z.infer<typeof ProductReviewWithCustomerSchema>;
export type ProductReviewReportItem = z.infer<typeof ProductReviewReportSchema>;

export type AddReviewResponse = z.infer<typeof AddReviewResponseSchema>;
export type GetProductReviewResponse = z.infer<typeof GetProductReviewResponseSchema>;
export type ReportReviewResponse = z.infer<typeof ReportReviewResponseSchema>;

export type AddReviewServiceResult = AddReviewResponse & {
  statusCode: ContentfulStatusCode;
};
export type GetProductReviewServiceResult = GetProductReviewResponse & {
  statusCode: ContentfulStatusCode;
};
export type ReportReviewServiceResult = ReportReviewResponse & {
  statusCode: ContentfulStatusCode;
};
