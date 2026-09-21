import { pgTable, bigint, text, timestamp, index, numeric } from "drizzle-orm/pg-core";
import { enumCTransferStatus } from "./enums";

export const orderCashbackTable = pgTable(
  "_order_cashback",
  {
    oCashbackId: bigint("o_cashback_id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    oPaymentId: bigint("o_payment_id", { mode: "number" }),
    customerId: bigint("customer_id", { mode: "number" }),
    oCashbackNominal: numeric("o_cashback_nominal", { precision: 10, scale: 2 }).default("0"),
    oCashbackStatus: enumCTransferStatus("o_cashback_status").default("new"),
    oCashbackNote: text("o_cashback_note"),
    oCashbackPendingDate: timestamp("o_cashback_pending_date", { withTimezone: true }),
    oCashbackUpdateDate: timestamp("o_cashback_update_date", { withTimezone: true }),
    oCashbackKey: text("o_cashback_key"),
    oCashbackCreateDate: timestamp("o_cashback_create_date", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    amountIdx: index("_order_cashback_amount").on(t.oCashbackNominal),
    idCompositeIdx: index("_order_cashback_id").on(t.oPaymentId, t.customerId),
    statusIdx: index("_order_cashback_status").on(t.oCashbackStatus),
  }),
);

export type OrderCashback = typeof orderCashbackTable.$inferSelect;
export type NewOrderCashback = typeof orderCashbackTable.$inferInsert;
