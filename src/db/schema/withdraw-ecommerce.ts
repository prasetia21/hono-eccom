import { pgTable, bigint, varchar, text, timestamp, index, numeric } from "drizzle-orm/pg-core";
import { enumDepositType7025, enumWithdrawWallet, enumWithdrawStatus } from "./enums";
import { sql } from "drizzle-orm";

export const withdrawEcommerceTable = pgTable(
  "_withdraw_ecommerce",
  {
    withdrawId: bigint("withdraw_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    customerId: bigint("customer_id", { mode: "number" }),
    merchantId: bigint("merchant_id", { mode: "number" }).notNull(),
    withdrawType: enumDepositType7025("withdraw_type"),
    withdrawWallet: enumWithdrawWallet("withdraw_wallet").default("transfer"),
    withdrawAmount: numeric("withdraw_amount", { precision: 10, scale: 2 }),
    withdrawDesc: text("withdraw_desc"),
    withdrawNote: text("withdraw_note"),
    withdrawBankToName: varchar("withdraw_bank_to_name", { length: 50 }).default(sql`NULL`),
    withdrawBankToAcc: varchar("withdraw_bank_to_acc", { length: 50 }).default(sql`NULL`),
    withdrawBankToNumber: varchar("withdraw_bank_to_number", { length: 50 }).default(sql`NULL`),
    withdrawBankToBranch: varchar("withdraw_bank_to_branch", { length: 50 }).default(sql`NULL`),
    withdrawBankFromName: varchar("withdraw_bank_from_name", { length: 50 }).default(sql`NULL`),
    withdrawBankFromAcc: varchar("withdraw_bank_from_acc", { length: 50 }).default(sql`NULL`),
    withdrawBankFromNumber: varchar("withdraw_bank_from_number", { length: 50 }).default(sql`NULL`),
    withdrawBankFromBranch: varchar("withdraw_bank_from_branch", { length: 50 }).default(sql`NULL`),
    withdrawBuktiPembayaran: varchar("withdraw_bukti_pembayaran", { length: 255 }).default(
      sql`NULL`,
    ),
    withdrawStatus: enumWithdrawStatus("withdraw_status").default("new"),
    withdrawCreateDate: timestamp("withdraw_create_date", { withTimezone: true }),
    withdrawFinishDate: timestamp("withdraw_finish_date", { withTimezone: true }),
    withdrawCancelDate: timestamp("withdraw_cancel_date", { withTimezone: true }),
  },
  (t) => ({
    amountIdx: index("_withdraw_ecommerce_amount").on(t.withdrawAmount),
    customerIdCompositeIdx: index("_withdraw_ecommerce_customer_id").on(t.customerId, t.merchantId),
    statusCompositeIdx: index("_withdraw_ecommerce_status").on(t.withdrawType, t.withdrawStatus),
    createDateIdx: index("_withdraw_ecommerce_withdraw_create_date").on(
      t.withdrawCreateDate.desc(),
    ),
  }),
);

export type WithdrawEcommerce = typeof withdrawEcommerceTable.$inferSelect;
export type NewWithdrawEcommerce = typeof withdrawEcommerceTable.$inferInsert;
