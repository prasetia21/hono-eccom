import { pgTable, bigint, timestamp, varchar } from "drizzle-orm/pg-core";
import { enumStatus1660 } from "./enums";

export const flashsaleCategoryTable = pgTable("_flash_sale_category", {
  fsCategoryId: bigint("fs_category_id", { mode: "number" })
    .generatedAlwaysAsIdentity()
    .primaryKey(),
  fsCategoryName: varchar("fs_category_name"),
  fsCategoryIcon: varchar("fs_category_icon"),
  fsCategoryStatus: enumStatus1660("fs_category_status").notNull().default("active"),
  fsCategoryCreateDate: timestamp("fs_category_create_date", { withTimezone: true }),
});

export type FlashsaleCategory = typeof flashsaleCategoryTable.$inferSelect;
export type NewFlashsaleCategory = typeof flashsaleCategoryTable.$inferInsert;
