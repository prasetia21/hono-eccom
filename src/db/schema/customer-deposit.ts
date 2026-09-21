import { pgTable, bigint, varchar, text, timestamp, index, numeric } from "drizzle-orm/pg-core";
import {
  enumDepositType,
  enumDepositMethod,
  enumDepositTaxStatus,
  enumDepositStatus,
} from "./enums";

export const customerDepositTable = pgTable(
  "_customer_deposit",
  {
    depositId: bigint("deposit_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    depositType: enumDepositType("deposit_type").default("topup"),
    depositMethod: enumDepositMethod("deposit_method").default("transfer"),
    depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).notNull(),
    depositAdmin: numeric("deposit_admin", { precision: 8, scale: 2 }).default("0"),
    depositBankTo: varchar("deposit_bank_to", { length: 20 }).notNull(),
    depositBankToAcc: text("deposit_bank_to_acc").notNull(),
    depositBankToNumber: varchar("deposit_bank_to_number", { length: 100 }).notNull(),
    depositBankFrom: varchar("deposit_bank_from", { length: 20 }).notNull(),
    depositBankAcc: varchar("deposit_bank_acc", { length: 50 }).notNull(),
    depositRefid: varchar("deposit_refid", { length: 50 }),
    depositText: text("deposit_text").notNull(),
    depositImage: varchar("deposit_image", { length: 150 }).notNull(),
    depositKey: text("deposit_key").notNull(),
    depositTaxStatus: enumDepositTaxStatus("deposit_tax_status").default("normal"),
    depositCron: bigint("deposit_cron", { mode: "number" }).default(0),
    depositStatus: enumDepositStatus("deposit_status").notNull(),
    depositStatusUpdateDate: timestamp("deposit_status_update_date", { withTimezone: true }),
    depositCreateDate: timestamp("deposit_create_date", { withTimezone: true }).notNull(),
    depositConfirmDate: timestamp("deposit_confirm_date", { withTimezone: true }),
    depositUpdateDate: timestamp("deposit_update_date", { withTimezone: true }),
    depositUpdateText: varchar("deposit_update_text", { length: 250 }),
    depositQueue: bigint("deposit_queue", { mode: "number" }).default(0),
  },
  (t) => ({
    customerIdIdx: index("_customer_deposit_customer_id").on(t.customerId),
    depositAmountIdx: index("_customer_deposit_deposit_amount").on(t.depositAmount),
    depositBankToIdx: index("_customer_deposit_deposit_bank_to").on(t.depositBankTo),
    depositBankToNumberIdx: index("_customer_deposit_deposit_bank_to_number").on(
      t.depositBankToNumber,
    ),
    depositCreateDateIdx: index("_customer_deposit_deposit_create_date").on(
      t.depositCreateDate.desc(),
    ),
    depositMethodIdx: index("_customer_deposit_deposit_method").on(t.depositMethod),
    depositRefidIdx: index("_customer_deposit_deposit_refid").on(t.depositRefid),
    depositStatusIdx: index("_customer_deposit_deposit_status").on(t.depositStatus),
    depositTaxStatusIdx: index("_customer_deposit_deposit_tax_status").on(t.depositTaxStatus),
    nominalIdx: index("_customer_deposit_nominal").on(t.depositAmount),
    userIdIdx: index("_customer_deposit_user_id").on(t.userId),
    depositKeyIdx: index("idx_deposit_deposit_key").on(t.depositKey),
  }),
);

export type CustomerDeposit = typeof customerDepositTable.$inferSelect;
export type NewCustomerDeposit = typeof customerDepositTable.$inferInsert;
