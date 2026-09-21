import { pgTable, bigint, varchar, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { enumZeroOne, enumCartStatus } from "./enums";

export const cartTable = pgTable(
  "_cart",
  {
    cartId: bigint("cart_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    productId: bigint("product_id", { mode: "number" }).notNull(),
    productName: varchar("product_name", { length: 200 }),
    merchantId: bigint("merchant_id", { mode: "number" }).notNull(),
    productAlias: varchar("product_alias", { length: 500 }),
    productImage: varchar("product_image", { length: 222 }),
    productGrosir: enumZeroOne("product_grosir").default("0"),
    productPriceHpp: numeric("product_price_hpp", { precision: 10, scale: 2 }),
    productPrice: numeric("product_price", { precision: 10, scale: 2 }),
    productPricePublish: numeric("product_price_publish", { precision: 10, scale: 2 }),
    productStock: varchar("product_stock", { length: 12 }),
    productWeight: numeric("product_weight"),
    productOption: varchar("product_option", { length: 255 }),
    psId: bigint("ps_id", { mode: "number" }),
    fsDetailId: bigint("fs_detail_id", { mode: "number" }),
    qty: varchar("qty", { length: 12 }).notNull(),
    note: varchar("note", { length: 500 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
    shipmentFee: numeric("shipment_fee", { precision: 10, scale: 2 }),
    cartStatus: enumCartStatus("cart_status").notNull(),
    cartCreate: timestamp("cart_create", { withTimezone: true }).notNull(),
  },
  (t) => ({
    cartCreateIdx: index("_cart_cart_create").on(t.cartCreate.desc()),
    customerIdIdx: index("_cart_customer_id").on(t.customerId),
    fsDetailIdIdx: index("_cart_fs_detail_id").on(t.fsDetailId),
    idIdx: index("_cart_id").on(t.customerId, t.productId, t.merchantId, t.psId, t.fsDetailId),
    merchantIdIdx: index("_cart_merchant_id").on(t.merchantId),
    productIdIdx: index("_cart_product_id").on(t.productId),
    psIdIdx: index("_cart_ps_id").on(t.psId),
    statusIdx: index("_cart_status").on(t.cartStatus),
  }),
);

export type Cart = typeof cartTable.$inferSelect;
export type NewCart = typeof cartTable.$inferInsert;
