import { pgTable, bigint, text, timestamp, index, numeric } from "drizzle-orm/pg-core";

export const transferSaldoTable = pgTable(
  "_transfer_saldo",
  {
    transferId: bigint("transfer_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    customerFrom: bigint("customer_from", { mode: "number" }).notNull(),
    customerTo: bigint("customer_to", { mode: "number" }).notNull(),
    transferAmount: numeric("transfer_amount", { precision: 10, scale: 2 }).notNull(),
    transferNote: text("transfer_note"),
    transferKey: text("transfer_key").notNull(),
    transferCreateDate: timestamp("transfer_create_date", { withTimezone: true }).notNull(),
  },
  (t) => ({
    amountIdx: index("_transfer_saldo_amount").on(t.transferAmount),
    customerFromIdx: index("_transfer_saldo_customer_from").on(t.customerFrom),
    customerToIdx: index("_transfer_saldo_customer_to").on(t.customerTo),
    createDateIdx: index("_transfer_saldo_transfer_create_date").on(t.transferCreateDate.desc()),
  }),
);

export type TransferSaldo = typeof transferSaldoTable.$inferSelect;
export type NewTransferSaldo = typeof transferSaldoTable.$inferInsert;
