import { pgTable, bigint, timestamp, index, varchar } from "drizzle-orm/pg-core";
import { enumStatus1660 } from "./enums";

export const flashsaleTable = pgTable(
  "_flash_sale",
  {
    fSaleId: bigint("f_sale_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    fSaleTitle: varchar("f_sale_title").notNull(),
    fSaleStartDate: timestamp("f_sale_start_date", { withTimezone: true }).notNull(),
    fSaleEndDate: timestamp("f_sale_end_date", { withTimezone: true }).notNull(),
    fSaleStatus: enumStatus1660("f_sale_status").notNull().default("active").notNull(),
    fSaleCreateDate: timestamp("f_sale_create_date", { withTimezone: true }).notNull(),
  },
  (t) => ({
    fSaleStatusIdx: index("_flash_sale_f_sale_status").on(t.fSaleStatus),
  }),
);

export type Flashsale = typeof flashsaleTable.$inferSelect;
export type NewFlashsale = typeof flashsaleTable.$inferInsert;
