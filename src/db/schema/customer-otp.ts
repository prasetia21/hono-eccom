import { bigint, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { customerOtpSectionEnum, customerOtpStatusEnum, enumStatus1660 } from "@/db/schema/enums";

export const customerOtpTable = pgTable(
  "_customer_otp",
  {
    cOtpId: bigint("c_otp_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    cSimId: bigint("c_sim_id", { mode: "number" }).default(0),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    cOtpSection: customerOtpSectionEnum("c_otp_section").notNull(),
    cOtpCode: text("c_otp_code").notNull(),
    cOtpIp: varchar("c_otp_ip", { length: 100 }).default(""),
    cOtpToken: text("c_otp_token").notNull(),
    cWalletStatus: enumStatus1660("c_wallet_status").default("active"),
    cOtpStatus: customerOtpStatusEnum("c_otp_status").notNull(),
    cOtpCreateDate: timestamp("c_otp_create_date", { withTimezone: true }).notNull(),
  },
  (table) => ({
    createDateIdx: index("_customer_otp_c_otp_create_date").on(table.cOtpCreateDate.desc()),
    sectionIdx: index("_customer_otp_c_otp_section").on(table.cOtpSection),
    simIdIdx: index("_customer_otp_c_sim_id").on(table.cSimId),
    otpStatusIdx: index("_customer_otp_c_otp_status").on(table.cOtpStatus),
    customerIdIdx: index("_customer_otp_customer_id").on(table.customerId),
    statusIdx: index("_customer_otp_status").on(table.cOtpSection, table.cOtpStatus),
  }),
);

export type CustomerOtp = typeof customerOtpTable.$inferSelect;
export type NewCustomerOtp = typeof customerOtpTable.$inferInsert;
