import { pgTable, bigint, varchar, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { enumProductCondition, enumProductStatus, enumProductGrade, enumZeroOne } from "./enums";

export const productTable = pgTable(
  "_product",
  {
    productId: bigint("product_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    merchantId: bigint("merchant_id", { mode: "number" }),
    catId: bigint("cat_id", { mode: "number" }),
    productName: varchar("product_name", { length: 100 }).default(""),
    productAlias: varchar("product_alias", { length: 100 }).default(""),
    productSortdesc: text("product_sortdesc"),
    productShortdescMeta: text("product_shortdesc_meta"),
    productDesc: text("product_desc"),
    productWeight: numeric("product_weight"),
    productLength: numeric("product_length"),
    productWidth: numeric("product_width"),
    productHeight: numeric("product_height"),
    productDiameter: numeric("product_diameter"),
    productStock: bigint("product_stock", { mode: "number" }),
    productHpp: numeric("product_hpp", { precision: 10, scale: 2 }).default("0"),
    productDiscount: numeric("product_discount", { precision: 10, scale: 2 }).default("0"),
    productPrice: numeric("product_price", { precision: 10, scale: 2 }).default("0"),
    productPricePublish: numeric("product_price_publish", { precision: 10, scale: 2 }).default("0"),
    productGrosir: enumZeroOne("product_grosir").notNull().default("0"),
    productMinGrosir: bigint("product_min_grosir", { mode: "number" }).notNull(),
    productPriceGrosir: numeric("product_price_grosir", { precision: 8, scale: 2 })
      .notNull()
      .default("0"),
    productPackagingPrice: numeric("product_packaging_price", { precision: 8, scale: 2 }).default(
      "0",
    ),
    productMargin: numeric("product_margin", { precision: 8, scale: 2 }).default("0"),
    productShipmentMargin: numeric("product_shipment_margin", { precision: 8, scale: 2 }).default(
      "0",
    ),
    productPickupMargin: numeric("product_pickup_margin", { precision: 8, scale: 2 }).default("0"),
    productIsInsurance: enumZeroOne("product_is_insurance").notNull(),
    productImage1: varchar("product_image_1", { length: 255 }),
    productImage2: varchar("product_image_2", { length: 255 }),
    productImage3: varchar("product_image_3", { length: 255 }),
    productImage4: varchar("product_image_4", { length: 255 }),
    productImage5: varchar("product_image_5", { length: 255 }),
    productHits: bigint("product_hits", { mode: "number" }).default(0),
    productTags: text("product_tags"),
    productCondition: enumProductCondition("product_condition").default("baru"),
    productRekomendasi: enumZeroOne("product_rekomendasi").default("0"),
    productStatus: enumProductStatus("product_status").notNull().default("new"),
    reasonBlockProduct: text("reason_block_product"),
    productUpdateDate: timestamp("product_update_date", { withTimezone: true }),
    productCreateDate: timestamp("product_create_date", { withTimezone: true }),
    productGrade: enumProductGrade("product_grade"),
    productMinus: text("product_minus"),
  },
  (t) => ({
    aliasIdx: index("_product_alias").on(t.productAlias),
    catIdIdx: index("_product_cat_id").on(t.catId),
    idIdx: index("_product_id").on(t.merchantId, t.catId),
    merchantIdIdx: index("_product_merchant_id").on(t.merchantId),
    nameIdx: index("_product_name").on(t.productName),
    createDateIdx: index("_product_product_create_date").on(t.productCreateDate.desc()),
    rekomendasiIdx: index("_product_product_rekomendasi").on(t.productRekomendasi),
    statusIdx: index("_product_product_status").on(t.productStatus),
    comboStatusIdx: index("_product_status").on(t.productRekomendasi, t.productStatus),
  }),
);

export type Product = typeof productTable.$inferSelect;
export type NewProduct = typeof productTable.$inferInsert;
