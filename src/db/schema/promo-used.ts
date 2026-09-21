import { bigint, numeric, pgTable, timestamp } from "drizzle-orm/pg-core";
import { enumZeroOne } from "@/db/schema/enums";

export const promoUsedTable = pgTable("_promo_used", {
  promoUsedId: bigint("promo_used_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  promoId: bigint("promo_id", { mode: "number" }).notNull(),
  customerId: bigint("customer_id", { mode: "number" }).notNull(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  oPaymentId: bigint("o_payment_id", { mode: "number" }),
  orderTotal: numeric("order_total", { precision: 10, scale: 2 }).notNull(),
  promoNominal: numeric("promo_nominal", { precision: 8, scale: 2 }).notNull(),
  promoUsedStatus: enumZeroOne("promo_used_status").notNull(),
  promoUsedCreateDate: timestamp("promo_used_create_date", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type PromoUsed = typeof promoUsedTable.$inferSelect;
export type NewPromoUsed = typeof promoUsedTable.$inferInsert;
