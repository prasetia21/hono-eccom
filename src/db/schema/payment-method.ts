import { pgTable, bigint, varchar, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { enumPaymentMethodGroup, enumPaymentMethodStatus } from "./enums";

export const paymentMethodTable = pgTable("_payment_method", {
  paymentMethodId: bigint("payment_method_id", { mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  paymentMethodGroup: enumPaymentMethodGroup("payment_method_group"),
  paymentMethodName: varchar("payment_method_name", { length: 100 }).notNull(),
  paymentMethodCode: varchar("payment_method_code", { length: 100 }).notNull(),
  paymentMethodAlias: varchar("payment_method_alias", { length: 100 }).notNull(),
  paymentMethodLogo: varchar("payment_method_logo", { length: 255 }),
  paymentMethod3rdparty: varchar("payment_method_3rdparty", { length: 100 }).notNull(),
  paymentMethodAdminPrice: numeric("payment_method_admin_price", {
    precision: 10,
    scale: 2,
  }).default("0"),
  paymentMethodDesc: text("payment_method_desc"),
  paymentMethodStatus: enumPaymentMethodStatus("payment_method_status"),
  paymentMethodCreateDate: timestamp("payment_method_create_date", { withTimezone: true }),
});

export type PaymentMethod = typeof paymentMethodTable.$inferSelect;
export type NewPaymentMethod = typeof paymentMethodTable.$inferInsert;
