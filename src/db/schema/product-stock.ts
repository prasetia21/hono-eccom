import { pgTable, bigint, varchar, timestamp, index, numeric } from "drizzle-orm/pg-core";
import { enumPsGrade } from "./enums";

export const productStockTable = pgTable(
  "_product_stock",
  {
    psId: bigint("ps_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    productId: bigint("product_id", { mode: "number" }).notNull(),
    psOption: varchar("ps_option", { length: 50 }).notNull(),
    psStock: bigint("ps_stock", { mode: "number" }).notNull(),
    psCreateDate: timestamp("ps_create_date", { withTimezone: true }),
    psUpdateDate: timestamp("ps_update_date", { withTimezone: true }),
    psVariant: varchar("ps_variant", { length: 100 }),
    psGrade: enumPsGrade("ps_grade"),
    psPrice: numeric("ps_price", { precision: 10, scale: 2 }).default("0"),
  },
  (t) => ({
    idIdx: index("_product_stock_id").on(t.productId),
  }),
);

export type ProductStock = typeof productStockTable.$inferSelect;
export type NewProductStock = typeof productStockTable.$inferInsert;
