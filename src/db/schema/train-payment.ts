import {
  pgTable,
  bigint,
  varchar,
  text,
  timestamp,
  date,
  index,
  numeric,
} from "drizzle-orm/pg-core";
import { enumTPaymentType, enumTPaymentStatus } from "./enums";
import { sql } from "drizzle-orm";

export const trainPaymentTable = pgTable(
  "_train_payment",
  {
    tPaymentId: bigint("t_payment_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    tBookingId: bigint("t_booking_id", { mode: "number" }).notNull(),
    tSessionId: bigint("t_session_id", { mode: "number" }).notNull(),
    whitelabelId: bigint("whitelabel_id", { mode: "number" })
      .notNull()
      .default(sql`'0'`),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    masterId: bigint("master_id", { mode: "number" })
      .notNull()
      .default(sql`'0'`),
    dealerId: bigint("dealer_id", { mode: "number" })
      .notNull()
      .default(sql`'0'`),
    depositId: bigint("deposit_id", { mode: "number" })
      .notNull()
      .default(sql`'0'`),
    tPaymentType: enumTPaymentType("t_payment_type").notNull(),
    tPaymentBank: varchar("t_payment_bank", { length: 50 }).default(sql`NULL`),
    tPaymentBankAcc: varchar("t_payment_bank_acc", { length: 50 }).default(sql`NULL`),
    tPaymentBankNumber: varchar("t_payment_bank_number", { length: 50 }).default(sql`NULL`),
    tBookingCode: varchar("t_booking_code", { length: 50 }).notNull(),
    tPaymentCode: varchar("t_payment_code", { length: 50 }).notNull(),
    tPaymentTransid: varchar("t_payment_transid", { length: 50 }).notNull(),
    tPaymentTripid: varchar("t_payment_tripid", { length: 50 }).notNull(),
    tPaymentTripdate: date("t_payment_tripdate").notNull(),
    tPaymentBookdate: timestamp("t_payment_bookdate", { withTimezone: true }).notNull(),
    tPaymentPrice: numeric("t_payment_price", { precision: 8, scale: 2 }).notNull().default("0.00"),
    tPaymentAdmin: numeric("t_payment_admin", { precision: 8, scale: 2 }).notNull().default("0.00"),
    tPaymentMarkup: numeric("t_payment_markup", { precision: 8, scale: 2 })
      .notNull()
      .default("0.00"),
    tPaymentDiscount: numeric("t_payment_discount", { precision: 8, scale: 2 })
      .notNull()
      .default("0.00"),
    tPaymentTotal: numeric("t_payment_total", { precision: 8, scale: 2 }).notNull().default("0.00"),
    tPaymentUnique: numeric("t_payment_unique", { precision: 8, scale: 2 })
      .notNull()
      .default("0.00"),
    tPaymentFee: numeric("t_payment_fee", { precision: 8, scale: 2 }).notNull().default("0.00"),
    tPaymentCashbackCompany: numeric("t_payment_cashback_company", { precision: 8, scale: 2 })
      .notNull()
      .default("0.00"),
    tPaymentCashbackMaster: numeric("t_payment_cashback_master", { precision: 8, scale: 2 })
      .notNull()
      .default("0.00"),
    tPaymentCashbackDealer: numeric("t_payment_cashback_dealer", { precision: 8, scale: 2 })
      .notNull()
      .default("0.00"),
    tPaymentCashback: numeric("t_payment_cashback", { precision: 8, scale: 2 })
      .notNull()
      .default("0.00"),
    tPaymentStatus: enumTPaymentStatus("t_payment_status").notNull().default("pending"),
    tPaymentDesc: varchar("t_payment_desc", { length: 255 }).default(""),
    tPaymentResponseDesc: varchar("t_payment_response_desc", { length: 255 }).default(""),
    tPaymentResponse: text("t_payment_response"),
    tPaymentDate: timestamp("t_payment_date", { withTimezone: true }),
    tPaymentCreateDate: timestamp("t_payment_create_date", { withTimezone: true }).notNull(),
  },
  (t) => ({
    trainPaymentAmountIdx: index("_train_payment_amount").on(
      t.tPaymentPrice,
      t.tPaymentAdmin,
      t.tPaymentMarkup,
      t.tPaymentTotal,
      t.tPaymentCashbackCompany,
      t.tPaymentCashbackMaster,
      t.tPaymentCashbackDealer,
      t.tPaymentCashback,
    ),
    customerIdIdx: index("_train_payment_customer_id").on(t.customerId),
    dealerIdIdx: index("_train_payment_dealer_id").on(t.dealerId),
    depositIdIdx: index("_train_payment_deposit_id").on(t.depositId),
    masterIdIdx: index("_train_payment_master_id").on(t.masterId),
    statusIdx: index("_train_payment_status").on(t.tPaymentStatus),
    tBookingIdIdx: index("_train_payment_t_booking_id").on(t.tBookingId),
    tSessionIdIdx: index("_train_payment_t_session_id").on(t.tSessionId),
    whitelabelIdIdx: index("_train_payment_whitelabel_id").on(t.whitelabelId),
  }),
);

export type TrainPayment = typeof trainPaymentTable.$inferSelect;
export type NewTrainPayment = typeof trainPaymentTable.$inferInsert;
