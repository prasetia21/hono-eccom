import { z } from "@hono/zod-openapi";

// Enum Schemas
export const ZeroOneSchema = z.enum(["0", "1"]);

export const tokenSchema = z
  .object({
    token: z.string().trim().min(1, "token wajib diisi"),
  })
  .openapi("TokenRequest");

// Response Schemas
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: "Data ditemukan" }),
    data: dataSchema,
  });

export const ErrorResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: false }),
    message: z.string().openapi({ example: "Error occurred" }),
  })
  .openapi("ErrorResponse");

export const NotFoundResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: false }),
    message: z.string().openapi({ example: "Data tidak ditemukan" }),
    data: z.array(z.any()).openapi({ example: [] }),
  })
  .openapi("NotFoundResponse");

// Pagination Schemas
const PaginationLinkSchema = z.object({
  url: z.string().nullable().openapi({
    example: "http://localhost:3000/api/v1/blog?page=2&limit=12",
  }),
  label: z.string().openapi({ example: "2" }),
  active: z.boolean().openapi({ example: false }),
});

export const PaginationSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    current_page: z.number().openapi({ example: 1 }),
    data: z.array(itemSchema),
    first_page_url: z.string().openapi({
      example: "http://localhost:3000/api/v1/blog?page=1&limit=12",
    }),
    from: z.number().openapi({ example: 1 }),
    last_page: z.number().openapi({ example: 10 }),
    last_page_url: z.string().openapi({
      example: "http://localhost:3000/api/v1/blog?page=10&limit=12",
    }),
    links: z.array(PaginationLinkSchema).openapi({
      example: [
        { url: null, label: "&laquo; Previous", active: false },
        {
          url: "http://localhost:3000/api/v1/blog?page=1&limit=12",
          label: "1",
          active: true,
        },
        {
          url: "http://localhost:3000/api/v1/blog?page=2&limit=12",
          label: "2",
          active: false,
        },
      ],
    }),
    next_page_url: z.string().nullable().openapi({
      example: "http://localhost:3000/api/v1/blog?page=2&limit=12",
    }),
    path: z.string().openapi({
      example: "http://localhost:3000/api/v1/blog",
    }),
    per_page: z.number().openapi({ example: 12 }),
    prev_page_url: z.string().nullable().openapi({ example: null }),
    to: z.number().openapi({ example: 12 }),
    total: z.number().openapi({ example: 120 }),
  });

// Query Schemas
export const PaginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .openapi({
      param: { name: "page", in: "query" },
      example: "1",
      description: "Nomor halaman (default: 1)",
    }),
  limit: z
    .string()
    .optional()
    .openapi({
      param: { name: "limit", in: "query" },
      example: "12",
      description: "Jumlah item per halaman, max 100 (default: 12)",
    }),
});

export const RajaOngkirCitySchema = z
  .object({
    r_city_id: z.number().nullable().optional(),
    province_id: z.number().nullable().optional(),
    city_id: z.number().nullable().optional(),
    subdistrict_id: z.number().nullable().optional(),
    r_city_province: z.string().nullable().optional(),
    r_city_name: z.string().nullable().optional(),
    r_city_subdistrict: z.string().nullable().optional(),
    r_city_postcode: z.string().nullable().optional(),
  })
  .passthrough();

// Type
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type RequestToken = z.infer<typeof tokenSchema>;
