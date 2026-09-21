import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { PaginationSchema, RajaOngkirCitySchema } from "@/shared/schemas/base.schema";

/* =========================================================================
 * ENUMS
 *========================================================================= */

export const OrderByEnumSchema = z.enum(["populer", "termahal", "termurah", "diskon", "terdekat"]);
export type OrderByEnumType = z.infer<typeof OrderByEnumSchema>;

export const ConditionEnumSchema = z.enum(["baru", "bekas"]);
export type ConditionEnumType = z.infer<typeof ConditionEnumSchema>;

/* =========================================================================
 * REQUEST SCHEMAS
 *========================================================================= */

export const ProductByCategoryRequestSchema = z
  .object({
    cat_id: z.coerce.string().optional().openapi({
      example: "358",
      description: "ID kategori produk",
    }),
    harga1: z.coerce.string().optional().openapi({
      example: "",
      description: "Harga minimum",
    }),
    harga2: z.coerce.string().optional().openapi({
      example: "",
      description: "Harga maksimum",
    }),
    condition: z
      .preprocess((val: string) => (val === "" ? undefined : val), ConditionEnumSchema.optional())
      .openapi({
        example: "baru",
        description: "Kondisi produk: baru, bekas",
      }),

    orderBy: z
      .preprocess((val: string) => (val === "" ? undefined : val), OrderByEnumSchema.optional())
      .openapi({
        example: "populer",
        description: "Pengurutan: populer, termahal, termurah, diskon, terdekat",
      }),
    // Auth data (optional)
    customer_id: z.coerce.string().optional().openapi({
      example: "1",
      description: "ID customer (dari auth)",
    }),
    // Location data for 'terdekat' order
    latitude: z.coerce.string().optional().openapi({
      example: "-7.7956",
      description: "Latitude lokasi customer",
    }),
    longitude: z.coerce.string().optional().openapi({
      example: "110.4550",
      description: "Longitude lokasi customer",
    }),
    page: z.coerce.number().optional().default(1).openapi({
      example: 1,
      description: "Halaman untuk pagination",
    }),
    limit: z.coerce.number().optional().default(10).openapi({
      example: 10,
      description: "Jumlah item per halaman",
    }),
  })
  .openapi("ProductByCategoryRequest");

/* =========================================================================
 * BASE SCHEMAS
 *========================================================================= */

export const DeliveryPriceSchema = z
  .object({
    d_price_id: z.number(),
    d_price_from: z.number(),
    d_price_to: z.number(),
    d_price_cost: z.number(),
    d_price_status: z.string(),
    d_price_create_date: z.string().nullable().optional(),
  })
  .passthrough();

export const CategorySchema = z
  .object({
    cat_id: z.number(),
    section_id: z.number(),
    cat_name: z.string(),
    cat_alias: z.string(),
    cat_desc: z.string(),
    cat_model: z.string(),
    cat_type: z.string(),
    cat_status_fee: z.string().nullable().optional(),
    cat_image: z.string(),
    cat_hits: z.number(),
    cat_parent: z.number(),
    cat_level: z.number(),
    cat_youtube_url: z.string().nullable().optional(),
    cat_status: z.string(),
    cat_root: z.string(),
    cat_order: z.number(),
    cat_favorite: z.number(),
    cat_meta_title: z.string().nullable().optional(),
    cat_meta_description: z.string().nullable().optional(),
    cat_meta_keyword: z.string().nullable().optional(),
    cat_image_banner: z.string().nullable().optional(),
    atribut: z.array(z.any()).optional(),
  })
  .passthrough();

export const MerchantSchema = z
  .object({
    merchant_id: z.number(),
    customer_id: z.number().nullable().optional(),
    r_city_id: z.number().nullable().optional(),
    merchant_reg_id: z.string(),
    merchant_fb_id: z.string(),
    merchant_code: z.string().nullable().optional(),
    merchant_name: z.string().nullable().optional(),
    merchant_email: z.string().nullable().optional(),
    merchant_password: z.string().nullable().optional(),
    merchant_logo: z.string().nullable().optional(),
    merchant_desc: z.string().nullable().optional(),
    merchant_rules: z.string().nullable().optional(),
    merchant_phone: z.string().nullable().optional(),
    merchant_web: z.string().nullable().optional(),
    merchant_facebook: z.string().nullable().optional(),
    merchant_twitter: z.string().nullable().optional(),
    merchant_instagram: z.string().nullable().optional(),
    merchant_address: z.string().nullable().optional(),
    merchant_province: z.string().nullable().optional(),
    merchant_district: z.string().nullable().optional(),
    merchant_subdistrict: z.string().nullable().optional(),
    merchant_city: z.string().nullable().optional(),
    merchant_postcode: z.string().nullable().optional(),
    merchant_lat: z.string().nullable().optional(),
    merchant_lng: z.string().nullable().optional(),
    merchant_hits: z.number().nullable().optional(),
    merchant_cat: z.string().nullable().optional(),
    merchant_expedisi: z.string().nullable().optional(),
    merchant_cod: z.string().nullable().optional(),
    merchant_ebmart: z.string().nullable().optional(),
    merchant_status: z.string(),
    merchant_open_time: z.string(),
    merchant_close_time: z.string(),
    merchant_close_start_date: z.string().nullable().optional(),
    merchant_close_end_date: z.string().nullable().optional(),
    merchant_create_date: z.string().nullable().optional(),
    merchant_platform: z.string().nullable().optional(),
    city: RajaOngkirCitySchema.nullable().optional(),
  })
  .passthrough();

export const ProductAttributeSchema = z
  .object({
    attr_id: z.number(),
    cat_id: z.number(),
    attr_name: z.string(),
    attr_alias: z.string(),
    attr_form_type: z.string(),
    attr_value: z.string(),
    attr_default_value: z.string(),
    attr_validate: z.string(),
    attr_status: z.string(),
    attr_order: z.number(),
    is_search: z.string(),
    is_stock: z.string(),
    attr_create: z.string(),
  })
  .passthrough();

export const ProductReviewSchema = z
  .object({
    review_id: z.number(),
    customer_id: z.number().nullable().optional(),
    product_id: z.number().nullable().optional(),
    review_title: z.string().nullable().optional(),
    review_desc: z.string().nullable().optional(),
    rating: z.coerce.number().nullable().optional(),
    review_create_date: z.string().nullable().optional(),
    review_image: z.string().nullable().optional(),
  })
  .passthrough();

export const OrderSchema = z
  .object({
    order_id: z.number(),
    order_number: z.string().nullable().optional(),
    o_payment_id: z.number().nullable().optional(),
    customer_id: z.number().nullable().optional(),
    merchant_id: z.number().nullable().optional(),
    driver_id: z.number().nullable().optional(),
    order_shipment_type: z.string().nullable().optional(),
    order_payment_type: z.string().nullable().optional(),
    payment_method_id: z.number().nullable().optional(),
    payment_method_group: z.string().nullable().optional(),
    payment_method_name: z.string().nullable().optional(),
    payment_method_desc: z.string().nullable().optional(),
    order_subtotal: z.number().nullable().optional(),
    order_tax: z.number().nullable().optional(),
    order_discount_price: z.number().nullable().optional(),
    order_shipment_price: z.number().nullable().optional(),
    order_shipment_discount: z.number().nullable().optional(),
    order_insurance: z.number().nullable().optional(),
    order_unique_code: z.number().nullable().optional(),
    order_admin_3rdparty: z.number().nullable().optional(),
    order_total: z.number().nullable().optional(),
    order_bank_from_account: z.string().nullable().optional(),
    order_bank_from_number: z.string().nullable().optional(),
    order_bank_from_branch: z.string().nullable().optional(),
    order_shipment_cost: z.string().nullable().optional(),
    order_shipment_courier: z.string().nullable().optional(),
    order_shipment_package: z.string().nullable().optional(),
    order_shipment_time: z.string().nullable().optional(),
    order_shipment_date: z.string().nullable().optional(),
    r_city_id: z.number().nullable().optional(),
    order_shipment_to: z.string().nullable().optional(),
    order_shipment_address: z.string().nullable().optional(),
    order_shipment_lat: z.string().nullable().optional(),
    order_shipment_lng: z.string().nullable().optional(),
    order_shipment_note: z.string().nullable().optional(),
    order_shipment_phone: z.string().nullable().optional(),
    order_shipment_resi: z.string().nullable().optional(),
    order_status: z.string().nullable().optional(),
    order_pending_payment_date: z.string().nullable().optional(),
    order_pending_payment_note: z.string().nullable().optional(),
    order_paid_date: z.string().nullable().optional(),
    order_paid_note: z.string().nullable().optional(),
    order_process_date: z.string().nullable().optional(),
    order_process_note: z.string().nullable().optional(),
    order_pickup_date: z.string().nullable().optional(),
    order_pickup_note: z.string().nullable().optional(),
    order_finish_date: z.string().nullable().optional(),
    order_finish_note: z.string().nullable().optional(),
    order_cancel_date: z.string().nullable().optional(),
    order_cancel_note: z.string().nullable().optional(),
    order_refund_date: z.string().nullable().optional(),
    order_refund_note: z.string().nullable().optional(),
    order_create_date: z.string().nullable().optional(),
  })
  .passthrough();

export const OrderDetailSchema = z
  .object({
    o_detail_id: z.number(),
    order_id: z.number().nullable().optional(),
    product_id: z.number().nullable().optional(),
    ps_id: z.number().nullable().optional(),
    fs_detail_id: z.number().nullable().optional(),
    o_detail_product_name: z.string().nullable().optional(),
    o_detail_product_image: z.string().nullable().optional(),
    o_detail_product_option: z.string().nullable().optional(),
    o_detail_product_grosir: z.string().nullable().optional(),
    o_detail_product_price: z.number().nullable().optional(),
    o_detail_product_hpp: z.number().nullable().optional(),
    o_detail_product_margin: z.number().nullable().optional(),
    o_detail_product_insurance: z.number().nullable().optional(),
    o_detail_product_weight: z.number().nullable().optional(),
    o_detail_qty: z.number().nullable().optional(),
    o_detail_note: z.string().nullable().optional(),
    o_detail_subtotal_margin: z.number().nullable().optional(),
    o_detail_subtotal_hpp: z.number().nullable().optional(),
    o_detail_subtotal: z.number().nullable().optional(),
    o_detail_status: z.string().nullable().optional(),
    o_detail_create_date: z.string().nullable().optional(),
  })
  .passthrough();

export const ProductStockSchema = z
  .object({
    ps_id: z.number(),
    product_id: z.number(),
    ps_option: z.string(),
    ps_stock: z.number(),
    ps_create_date: z.string().nullable().optional(),
    ps_update_date: z.string().nullable().optional(),
    ps_variant: z.string().nullable().optional(),
    ps_grade: z.string().nullable().optional(),
    ps_price: z.number().nullable().optional(),
  })
  .passthrough();

export const ProductPointSchema = z
  .object({
    p_point_id: z.number(),
    product_id: z.number().nullable().optional(),
    p_point_create: z.number().nullable().optional(),
    p_point_update: z.number().nullable().optional(),
    p_point_hit: z.number().nullable().optional(),
    p_point_favorite: z.number().nullable().optional(),
    p_point_cart: z.number().nullable().optional(),
    p_point_buy: z.number().nullable().optional(),
    p_point_rating: z.number().nullable().optional(),
    p_point_age: z.number().nullable().optional(),
    p_point_total: z.number().nullable().optional(),
    p_point_update_date: z.string().nullable().optional(),
    p_point_age_date: z.string().nullable().optional(),
    p_point_reset_date: z.string().nullable().optional(),
    p_point_create_date: z.string().nullable().optional(),
  })
  .passthrough();

export const ProductItemSchema = z
  .object({
    product_id: z.number(),
    merchant_id: z.number(),
    cat_id: z.number(),
    product_name: z.string(),
    product_alias: z.string().optional(),
    product_shortdesc_meta: z.string().optional(),
    product_desc: z.string().optional(),
    product_weight: z.string().optional(),
    product_length: z.string().optional(),
    product_width: z.string().optional(),
    product_height: z.string().optional(),
    product_diameter: z.string().optional(),
    product_stock: z.number(),
    product_hpp: z.number(),
    product_discount: z.number(),
    product_price: z.number(),
    product_price_publish: z.number(),
    product_grosir: z.string(),
    product_min_grosir: z.number(),
    product_price_grosir: z.number(),
    product_packaging_price: z.number(),
    product_margin: z.number(),
    product_shipment_margin: z.number(),
    product_pickup_margin: z.number(),
    product_is_insurance: z.string(),
    product_image_1: z.string().optional(),
    product_image_2: z.string().optional(),
    product_image_3: z.string().optional(),
    product_image_4: z.string().optional(),
    product_image_5: z.string().optional(),
    product_hits: z.number(),
    product_tags: z.string().optional(),
    product_condition: z.string(),
    product_rekomendasi: z.string(),
    product_status: z.string(),
    product_update_date: z.string().optional(),
    product_create_date: z.string().optional(),
    product_grade: z.string().optional(),
    product_minus: z.string().optional(),
    product_rating: z.number().optional(),
    count_order: z.number().optional(),
    is_cod: z.boolean().optional(),
    is_cod_logout: z.boolean().optional(),
    is_courier: z.boolean().optional(),
    is_courier_logout: z.boolean().optional(),
    persen_diskon: z.number().optional(),
    harga_diskon: z.number().optional(),
    merchant: MerchantSchema.nullable().optional(),
    category: CategorySchema.nullable().optional(),
    ongoing_fs_detail: z.object({}).passthrough().nullable().optional(),
    distance: z.number().optional(),
    p_point_total: z.number().optional(),
  })
  .passthrough();

/* =========================================================================
 * PAGINATION SCHEMAS
 *========================================================================= */

export const PaginatedProductSchema = PaginationSchema(ProductItemSchema);

/* =========================================================================
 * OPENAPI RESPONSE SCHEMAS
 *========================================================================= */

const ProductByCategorySuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: PaginatedProductSchema,
});

const ProductFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const ProductByCategoryResponseSchema = z
  .union([ProductByCategorySuccessSchema, ProductFailureSchema])
  .openapi("ProductByCategoryResponse");

/* =========================================================================
 * TYPES
 *========================================================================= */

export type ProductByCategoryRequest = z.infer<typeof ProductByCategoryRequestSchema>;
export type ProductByCategoryResponse = z.infer<typeof ProductByCategoryResponseSchema>;
export type ProductByCategoryServiceResult = ProductByCategoryResponse & {
  statusCode: ContentfulStatusCode;
};

export type ProductItem = z.infer<typeof ProductItemSchema>;

/* =========================================================================
 * PRODUCT CAT MOST VIEW
 *========================================================================= */

export const ProductCatMostViewRequestSchema = z
  .object({
    cat_alias: z.coerce
      .string({
        required_error: "anda belum memsasukkan data category alias",
        invalid_type_error: "anda belum memsasukkan data category alias",
      })
      .min(1, "anda belum memsasukkan data category alias")
      .openapi({
        example: "elektronik",
        description: "Alias kategori produk",
      }),
    harga1: z.coerce.string().optional().openapi({
      example: "",
      description: "Harga minimum",
    }),
    harga2: z.coerce.string().optional().openapi({
      example: "",
      description: "Harga maksimum",
    }),
    condition: z
      .preprocess((val: string) => (val === "" ? undefined : val), ConditionEnumSchema.optional())
      .openapi({
        example: "baru",
        description: "Kondisi produk: baru, bekas",
      }),
    orderBy: z
      .preprocess((val: string) => (val === "" ? undefined : val), OrderByEnumSchema.optional())
      .openapi({
        example: "populer",
        description: "Pengurutan: populer, termahal, termurah, diskon. Default: p_point_total",
      }),
    keySearch: z.coerce.string().optional().openapi({
      example: "",
      description: "Kata kunci pencarian (product_name, product_desc, product_tags)",
    }),
    customer_id: z.coerce.string().optional().openapi({
      example: "1",
      description: "ID customer (dari auth)",
    }),
    page: z.coerce.number().optional().default(1).openapi({
      example: 1,
      description: "Halaman untuk pagination",
    }),
    limit: z.coerce.number().optional().default(10).openapi({
      example: 10,
      description: "Jumlah item per halaman",
    }),
  })
  .openapi("ProductCatMostViewRequest");

const ProductCatMostViewSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: PaginatedProductSchema,
  cat: CategorySchema.nullable(),
});

const ProductCatMostViewFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const ProductCatMostViewResponseSchema = z
  .union([ProductCatMostViewSuccessSchema, ProductCatMostViewFailureSchema])
  .openapi("ProductCatMostViewResponse");

export type ProductCatMostViewRequest = z.infer<typeof ProductCatMostViewRequestSchema>;
export type ProductCatMostViewResponse = z.infer<typeof ProductCatMostViewResponseSchema>;
export type ProductCatMostViewServiceResult = ProductCatMostViewResponse & {
  statusCode: ContentfulStatusCode;
};

/* =========================================================================
 * CATEGORY RECOMMEND
 *========================================================================= */

export const CategoryRecommendProductSchema = z
  .object({
    product_id: z.number(),
    merchant_id: z.number().nullable().optional(),
    cat_id: z.number().nullable().optional(),
    product_name: z.string(),
    product_alias: z.string().nullable().optional(),
    product_image_1: z.string().nullable().optional(),
    product_price: z.number().nullable().optional(),
    product_price_publish: z.number().nullable().optional(),
    product_stock: z.number().nullable().optional(),
    product_hits: z.number().nullable().optional(),
    product_status: z.string().nullable().optional(),
  })
  .passthrough();

export const CategoryRecommendItemSchema = z
  .object({
    pc_recommend_id: z.number(),
    cat_id: z.number(),
    pc_order_key: z.number(),
    pc_recommend_image: z.string().nullable().optional(),
    pc_recommend_status: z.string().nullable().optional(),
    pc_recommend_create_date: z.string().nullable().optional(),
    pc_recommend_update_date: z.string().nullable().optional(),
    category: CategorySchema.extend({
      product: z.array(CategoryRecommendProductSchema),
    })
      .nullable()
      .optional(),
  })
  .passthrough();

const CategoryRecommendSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(CategoryRecommendItemSchema),
});

const CategoryRecommendFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const CategoryRecommendResponseSchema = z
  .union([CategoryRecommendSuccessSchema, CategoryRecommendFailureSchema])
  .openapi("CategoryRecommendResponse");

export type CategoryRecommendResponse = z.infer<typeof CategoryRecommendResponseSchema>;
export type CategoryRecommendServiceResult = CategoryRecommendResponse & {
  statusCode: ContentfulStatusCode;
};
