import { pgTable, bigint, timestamp, varchar, text, numeric } from "drizzle-orm/pg-core";
import { enumFsDetailStatus } from "./enums";

export const flashsaleDetailTable = pgTable("_flash_sale_detail", {
  fsDetailId: bigint("fs_detail_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  fSaleId: bigint("f_sale_id", { mode: "number" }),
  fsCategoryId: bigint("fs_category_id", { mode: "number" }),
  productId: bigint("product_id", { mode: "number" }),
  fsDetailProductName: varchar("fs_detail_product_name"),
  fsDetailProductImage: text("fs_detail_product_image"),
  fsDetailProductStock: bigint("fs_detail_product_stock", { mode: "number" }),
  fsDetailProductNominal: numeric("fs_detail_product_nominal", { precision: 10, scale: 2 }),
  fsDetailProductDiscount: numeric("fs_detail_product_discount", { precision: 8, scale: 2 }),
  fsDetailProductPrice: numeric("fs_detail_product_price", { precision: 10, scale: 2 }),
  fsDetailStatus: enumFsDetailStatus("fs_detail_status").notNull().default("active"),
  fsDetailCreateDate: timestamp("fs_detail_create_date", { withTimezone: true }),
});

export type FlashsaleDetail = typeof flashsaleDetailTable.$inferSelect;
export type NewFlashsaleDetail = typeof flashsaleDetailTable.$inferInsert;
