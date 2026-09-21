import { pgTable, bigint, timestamp, index, numeric } from "drizzle-orm/pg-core";
import { enumABillStatus } from "@/db/schema/enums.ts";

export const addsBillTable = pgTable(
  "_adds_bill",
  {
    aBillId: bigint("a_bill_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    addsId: bigint("adds_id", { mode: "number" }).notNull(),
    aBillAmount: numeric("a_bill_amount", { precision: 8, scale: 2 }).notNull(),
    aBillStartDate: timestamp("a_bill_start_date", { withTimezone: true }).notNull(),
    aBillEndDate: timestamp("a_bill_end_date", { withTimezone: true }).notNull(),
    aBillStatus: enumABillStatus("a_bill_status").notNull(),
    aBillCreateDate: timestamp("a_bill_create_date", { withTimezone: true }).notNull(),
  },
  (table) => ({
    addsIdIdx: index("_adds_bill_adds_id").on(table.addsId),
    aBillStatusIdx: index("_adds_bill_status").on(table.aBillStatus),
  }),
);

export type AddsBill = typeof addsBillTable.$inferSelect;
export type NewAddsBill = typeof addsBillTable.$inferInsert;
