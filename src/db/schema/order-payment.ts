import { bigint, index, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { enumPaymentStatus, enumPaymentType } from "@/db/schema/enums";

export const orderPaymentTable = pgTable(
  "_order_payment",
  {
    oPaymentId: bigint("o_payment_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }),
    oPaymentTrxId: varchar("o_payment_trx_id", { length: 20 }),
    paymentMethodId: bigint("payment_method_id", { mode: "number" }),
    oPaymentCode: varchar("o_payment_code", { length: 20 }),
    oPaymentType: enumPaymentType("o_payment_type").default("balance"),
    oPaymentGroup: varchar("o_payment_group", { length: 25 }),
    oPaymentName: varchar("o_payment_name", { length: 255 }),
    oPaymentDesc: text("o_payment_desc"),
    oPaymentBank: varchar("o_payment_bank", { length: 100 }),
    oPaymentBankAccount: varchar("o_payment_bank_account", { length: 255 }),
    oPaymentBankNumber: varchar("o_payment_bank_number", { length: 50 }),
    oPaymentBankBranch: varchar("o_payment_bank_branch", { length: 255 }),
    oPaymentVaBank: varchar("o_payment_va_bank", { length: 100 }),
    oPaymentVaNumber: varchar("o_payment_va_number", { length: 100 }),
    oPaymentVaBankRefid: varchar("o_payment_va_bank_refid", { length: 255 }),
    oPaymentRetailBank: varchar("o_payment_retail_bank", { length: 255 }),
    oPaymentRetailCode: varchar("o_payment_retail_code", { length: 255 }),
    oPaymentRetailBankRefid: varchar("o_payment_retail_bank_refid", { length: 255 }),
    oPaymentQrisUrl: text("o_payment_qris_url"),
    oPaymentSubtotal: numeric("o_payment_subtotal", { precision: 10, scale: 2 }).default("0"),
    oPaymentService: numeric("o_payment_service", { precision: 10, scale: 2 }).default("0"),
    oPaymentAdminFee: numeric("o_payment_admin_fee", { precision: 8, scale: 2 }),
    oPaymentTotal: numeric("o_payment_total", { precision: 10, scale: 2 }).default("0"),
    oPaymentCashback: numeric("o_payment_cashback", { precision: 8, scale: 2 }).default("0"),
    oPaymentStatus: enumPaymentStatus("o_payment_status").default("pending"),
    oPaymentNote: text("o_payment_note"),
    oPaymentExpiredDate: timestamp("o_payment_expired_date", { withTimezone: true }),
    oPaymentUpdateDate: timestamp("o_payment_update_date", { withTimezone: true }),
    oPaymentCreateDate: timestamp("o_payment_create_date", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    orderPaymentCodeIdx: index("_order_payment_code").on(t.oPaymentCode),
    customerIdIdx: index("_order_payment_customer_id").on(t.customerId),
    orderPaymentIdIdx: index("_order_payment_id").on(t.customerId, t.paymentMethodId),
    orderCreateDateIdx: index("_order_payment_o_payment_create_date").on(
      t.oPaymentCreateDate.desc(),
    ),
    orderPaymentStatusIdx: index("_order_payment_status").on(t.oPaymentType, t.oPaymentStatus),
  }),
);

export type OrderPayment = typeof orderPaymentTable.$inferSelect;
export type NewOrderPayment = typeof orderPaymentTable.$inferInsert;
