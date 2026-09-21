import { z } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const formNumber = (schema: z.ZodTypeAny) =>
  z.preprocess((value: unknown) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    return Number(value);
  }, schema);

// BASE SCHEMAS
export const CartProductSchema = z.object({
  product_id: z.number(),
  merchant_id: z.number(),
  cat_id: z.number(),

  product_name: z.string(),
  product_alias: z.string(),
  product_sortdesc: z.string(),
  product_shortdesc_meta: z.string(),
  product_desc: z.string(),

  product_weight: z.string(),
  product_length: z.string(),
  product_width: z.string(),
  product_height: z.string(),
  product_diameter: z.string(),
  product_stock: z.number(),

  product_hpp: z.string(),
  product_discount: z.string().nullable(),
  product_price: z.string(),
  product_price_publish: z.string(),

  product_grosir: z.string(),
  product_min_grosir: z.number(),
  product_price_grosir: z.array(z.unknown()),

  product_packaging_price: z.string(),
  product_margin: z.string(),
  product_shipment_margin: z.string(),
  product_pickup_margin: z.string(),

  product_is_insurance: z.string(),

  product_image_1: z.string().nullable(),
  product_image_2: z.string().nullable(),
  product_image_3: z.string().nullable(),
  product_image_4: z.string().nullable(),
  product_image_5: z.string().nullable(),

  product_hits: z.number(),

  product_tags: z.string(),
  product_condition: z.string(),
  product_rekomendasi: z.string(),
  product_status: z.string(),

  reason_block_product: z.string().nullable(),
  product_update_date: z.string().nullable(),
  product_create_date: z.string(),

  ongoing_fs_detail: z.null(),
});

export const CartVariantSchema = z.object({
  ps_id: z.number(),
  product_id: z.number(),
  ps_option: z.string(),
  ps_stock: z.number(),
  ps_grade: z.string().nullable(),

  ps_price: z.string().nullable(),

  ps_create_date: z.string(),
  ps_update_date: z.string(),
});

export const CartDetailSchema = z.object({
  cart_id: z.number(),
  customer_id: z.number(),
  product_id: z.number(),

  product_name: z.string(),
  merchant_id: z.number(),

  ps_id: z.number(),
  fs_detail_id: z.number().nullable(),

  product_alias: z.string(),
  product_image: z.string(),

  product_grosir: z.string(),

  product_price_hpp: z.string(),
  product_price: z.string(),
  product_price_publish: z.string(),

  product_stock: z.string(),
  product_weight: z.string(),

  product_option: z.null(),

  qty: z.string(),
  note: z.string(),

  total_amount: z.string(),
  shipment_fee: z.string(),

  cart_status: z.string(),
  cart_create: z.string(),

  product: CartProductSchema,
  variant: CartVariantSchema.nullable(),
});

export const CartCitySchema = z.object({
  r_city_id: z.number(),
  province_id: z.number(),
  city_id: z.number(),
  subdistrict_id: z.number(),

  r_city_province: z.string(),
  r_city_name: z.string(),
  r_city_subdistrict: z.string(),
  r_city_postcode: z.string(),

  r_city_create_date: z.string(),
});

export const CartMerchantSchema = z.object({
  merchant_id: z.number(),
  customer_id: z.number(),
  r_city_id: z.number(),

  merchant_reg_id: z.string(),
  merchant_fb_id: z.string(),
  merchant_code: z.string(),
  merchant_name: z.string(),
  merchant_email: z.string(),

  merchant_logo: z.string(),

  merchant_desc: z.string(),
  merchant_rules: z.string(),

  merchant_phone: z.string(),

  merchant_web: z.string(),
  merchant_facebook: z.string(),
  merchant_twitter: z.string(),
  merchant_instagram: z.string(),

  merchant_address: z.string(),
  merchant_province: z.string(),
  merchant_district: z.string(),
  merchant_subdistrict: z.string(),
  merchant_city: z.string(),
  merchant_postcode: z.string(),

  merchant_lat: z.string(),
  merchant_lng: z.string(),

  merchant_hits: z.number().nullable(),
  merchant_cat: z.string(),

  merchant_expedisi: z.string(),

  merchant_cod: z.string(),
  merchant_ebmart: z.string(),
  merchant_status: z.string(),

  merchant_open_time: z.string(),
  merchant_close_time: z.string(),

  merchant_close_start_date: z.string().nullable(),
  merchant_close_end_date: z.string().nullable(),

  merchant_create_date: z.string(),
  merchant_platform: z.string(),

  is_cod_logout: z.boolean(),
  is_cod: z.boolean(),
  is_courier_logout: z.boolean(),
  is_courier: z.boolean(),

  cart: z.array(CartDetailSchema),
  city: CartCitySchema,
});

// REQUEST SCHEMAS
export const GetCartRequestSchema = z.object({}).openapi("GetCartRequest");

export const AddCartRequestSchema = z
  .object({
    product_id: formNumber(z.number().int().positive()),

    qty: formNumber(z.number().int().nonnegative()),

    note: z.string().nullable().optional(),

    product_variant: formNumber(z.number().int().nonnegative().nullable().optional()),
  })
  .openapi("AddCartRequest");

// RESPONSE SCHEMAS
const GetCartSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(CartMerchantSchema),
});

const CartFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const GetCartResponseSchema = z
  .union([GetCartSuccessSchema, CartFailureSchema])
  .openapi("GetCartResponse");

const AddCartSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.unknown(),
  totalQty: z.number(),
});

const AddCartFailureSchema = z.object({
  success: z.literal(false),
  failed: z.string(),
  message: z.string(),
});

export const AddCartResponseSchema = z
  .union([AddCartSuccessSchema, AddCartFailureSchema])
  .openapi("AddCartResponse");

export const CheckoutNowRequestSchema = z
  .object({
    product_id: formNumber(z.number().int()),
    qty: formNumber(z.number().int()),
    note: z.string().nullable().optional(),
    product_variant: formNumber(z.number().int().nonnegative().nullable().optional()),
  })
  .openapi("CheckoutNowRequest");

const CheckoutNowSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.unknown(),
  totalQty: z.number(),
});

const CheckoutNowFailureSchema = z.object({
  success: z.literal(false),
  failed: z.string(),
  message: z.string(),
});

export const CheckoutNowResponseSchema = z
  .union([CheckoutNowSuccessSchema, CheckoutNowFailureSchema])
  .openapi("CheckoutNowResponse");

export const CartQtyV3RequestSchema = z
  .object({
    cart_id: formNumber(z.number().int().positive()),
    qty: formNumber(z.number().int()),
  })
  .openapi("CartQtyV3Request");

export const CartQtyV3ResponseSchema = z
  .union([
    z.object({
      success: z.literal(true),
      message: z.string(),
    }),
    z.object({
      success: z.literal(false),
      failed: z.string(),
      message: z.string(),
    }),
  ])
  .openapi("CartQtyV3Response");

export const CartDeleteV2RequestSchema = z
  .object({
    cart_id: formNumber(z.number().int().positive()),
  })
  .openapi("CartDeleteV2Request");

export const CartDeleteV2ResponseSchema = z
  .union([
    z.object({
      success: z.literal(true),
      message: z.string(),
    }),
    z.object({
      success: z.literal(false),
      message: z.string(),
    }),
  ])
  .openapi("CartDeleteV2Response");

export const CartDeleteAllV2RequestSchema = z.object({}).openapi("CartDeleteAllV2Request");

export const CartDeleteAllV2ResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .openapi("CartDeleteAllV2Response");

export const CartSelectedV2RequestSchema = z
  .object({
    cart_id: formNumber(z.number().int().positive()),
  })
  .openapi("CartSelectedV2Request");

export const CartSelectedV2ResponseSchema = z
  .union([
    z.object({
      success: z.literal(true),
      message: z.string(),
    }),
    z.object({
      success: z.literal(false),
      message: z.string(),
    }),
  ])
  .openapi("CartSelectedV2Response");

export const CartSelectedAllRequestSchema = z
  .object({
    status: z.enum(["on", "off"]),
  })
  .openapi("CartSelectedAllRequest");

export const CartSelectedAllResponseSchema = z
  .union([
    z.object({
      success: z.literal(true),
      message: z.string(),
    }),
    z.object({
      success: z.literal(false),
      message: z.string(),
    }),
  ])
  .openapi("CartSelectedAllResponse");

export const CartSelectedMerchantRequestSchema = z
  .object({
    merchant_id: formNumber(z.number().int().positive()),
  })
  .openapi("CartSelectedMerchantRequest");

export const CartSelectedMerchantResponseSchema = z
  .union([
    z.object({
      success: z.literal(true),
      message: z.string(),
    }),
    z.object({
      success: z.literal(false),
      message: z.string(),
    }),
  ])
  .openapi("CartSelectedMerchantResponse");

export const ProductCheckoutV3RequestSchema = z.object({}).openapi("ProductCheckoutV3Request");

const ProductCheckoutV3SuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.array(z.unknown()),
});

const ProductCheckoutV3FailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

const ProductCheckoutV3RefreshSchema = z.object({
  success: z.literal(false),
  refresh: z.literal(true),
  message: z.string(),
});

export const ProductCheckoutV3ResponseSchema = z
  .union([
    ProductCheckoutV3SuccessSchema,
    ProductCheckoutV3RefreshSchema,
    ProductCheckoutV3FailureSchema,
  ])
  .openapi("ProductCheckoutV3Response");

// TYPES
export type CartProduct = z.infer<typeof CartProductSchema>;
export type CartVariant = z.infer<typeof CartVariantSchema>;
export type CartDetail = z.infer<typeof CartDetailSchema>;
export type CartCity = z.infer<typeof CartCitySchema>;
export type CartMerchant = z.infer<typeof CartMerchantSchema>;

export type GetCartRequest = z.infer<typeof GetCartRequestSchema>;
export type GetCartResponse = z.infer<typeof GetCartResponseSchema>;
export type GetCartServiceResult = GetCartResponse & { statusCode: ContentfulStatusCode };

export type AddCartRequest = z.infer<typeof AddCartRequestSchema>;
export type AddCartResponse = z.infer<typeof AddCartResponseSchema>;
export type AddCartServiceResult = AddCartResponse & { statusCode: ContentfulStatusCode };

export type CheckoutNowResponse = z.infer<typeof CheckoutNowResponseSchema>;
export type CheckoutNowServiceResult = CheckoutNowResponse & { statusCode: ContentfulStatusCode };
export type CheckoutNowRequest = z.infer<typeof CheckoutNowRequestSchema>;

export type CartQtyV3Request = z.infer<typeof CartQtyV3RequestSchema>;

export type UpdateCartServiceResult =
  | {
      success: true;
      message: string;
      statusCode: ContentfulStatusCode;
    }
  | {
      success: false;
      failed: string;
      message: string;
      statusCode: ContentfulStatusCode;
    };

export type CartDeleteV2Request = z.infer<typeof CartDeleteV2RequestSchema>;
export type CartDeleteV2Response = z.infer<typeof CartDeleteV2ResponseSchema>;
export type CartDeleteServiceResult = CartDeleteV2Response & { statusCode: ContentfulStatusCode };

export type CartDeleteAllV2Request = z.infer<typeof CartDeleteAllV2RequestSchema>;
export type CartDeleteAllV2Response = z.infer<typeof CartDeleteAllV2ResponseSchema>;
export type CartDeleteAllServiceResult = CartDeleteAllV2Response & {
  statusCode: ContentfulStatusCode;
};

export type CartSelectedV2Request = z.infer<typeof CartSelectedV2RequestSchema>;
export type CartSelectedV2Response = z.infer<typeof CartSelectedV2ResponseSchema>;
export type CartSelectedServiceResult = CartSelectedV2Response & {
  statusCode: ContentfulStatusCode;
};

export type CartSelectedAllRequest = z.infer<typeof CartSelectedAllRequestSchema>;
export type CartSelectedAllResponse = z.infer<typeof CartSelectedAllResponseSchema>;
export type CartSelectedAllServiceResult = CartSelectedAllResponse & {
  statusCode: ContentfulStatusCode;
};

export type CartSelectedMerchantRequest = z.infer<typeof CartSelectedMerchantRequestSchema>;
export type CartSelectedMerchantResponse = z.infer<typeof CartSelectedMerchantResponseSchema>;
export type CartSelectedMerchantServiceResult = CartSelectedMerchantResponse & {
  statusCode: ContentfulStatusCode;
};

export type ProductCheckoutV3Request = z.infer<typeof ProductCheckoutV3RequestSchema>;
export type ProductCheckoutV3Response = z.infer<typeof ProductCheckoutV3ResponseSchema>;
export type ProductCheckoutV3ServiceResult = ProductCheckoutV3Response & {
  statusCode: ContentfulStatusCode;
};
