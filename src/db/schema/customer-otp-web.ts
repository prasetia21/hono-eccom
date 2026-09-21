import { bigint, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { customerOtpStatusEnum, customerOtpWebSectionEnum } from "@/db/schema/enums";

export const customerOtpWebTable = pgTable(
  "_customer_otp_web",
  {
    cwOtpId: bigint("cw_otp_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    cwOtpSection: customerOtpWebSectionEnum("cw_otp_section"),
    cwOtpCode: text("cw_otp_code").notNull(),
    cwOtpIp: varchar("cw_otp_ip", { length: 20 }).default(""),
    cwOtpToken: text("cw_otp_token").notNull(),
    cwOtpStatus: customerOtpStatusEnum("cw_otp_status").notNull(),
    cwOtpCreateDate: timestamp("cw_otp_create_date", { withTimezone: true }).notNull(),
  },
  (table) => ({
    customerIdIdx: index("_customer_otp_web_customer_id").on(table.customerId),
    tokenIdx: index("_customer_otp_web_token").on(table.cwOtpToken),
  }),
);

export type CustomerOtpWeb = typeof customerOtpWebTable.$inferSelect;
export type NewCustomerOtpWeb = typeof customerOtpWebTable.$inferInsert;
