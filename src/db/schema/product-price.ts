import { bigint, index, numeric, pgTable, timestamp } from "drizzle-orm/pg-core";

export const productPriceTable = pgTable(
  "_product_price",
  {
    pPriceId: bigint("p_price_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    productId: bigint("product_id", { mode: "number" }),
    pPriceQty: bigint("p_price_qty", { mode: "number" }),
    pPriceHpp: numeric("p_price_hpp", { precision: 10, scale: 2 }),
    pPriceNominal: numeric("p_price_nominal", { precision: 10, scale: 2 }),
    pPriceCreateDate: timestamp("p_price_create_date", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    idxProductPriceProduct: index("_product_price_product_id").on(t.productId),
  }),
);

export type ProductPrice = typeof productPriceTable.$inferSelect;
export type NewProductPrice = typeof productPriceTable.$inferInsert;
