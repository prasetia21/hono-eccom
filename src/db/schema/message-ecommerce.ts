import { pgTable, bigint, varchar, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { enumZeroOne, enumDepositType7025 } from "./enums";

export const enumMEcommerceSection = pgEnum("enum_m_ecommerce_section", [
  "deposit",
  "ppob",
  "ecommerce",
  "other",
]);

export const enumMEcommerceStatus = pgEnum("enum_bank_mutasi_status", ["open", "close"]);

export const messageEcommerceTable = pgTable(
  "_message_ecommerce",
  {
    mEcommerceId: bigint("m_ecommerce_id", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    mEcommerceType: enumDepositType7025("m_ecommerce_type"),
    customerId: bigint("customer_id", { mode: "number" }),
    merchantId: bigint("merchant_id", { mode: "number" }),
    mEcommerceRefid: varchar("m_ecommerce_refid", { length: 255 }),
    mEcommerceSection: enumMEcommerceSection("m_ecommerce_section"),
    mEcommerceStatus: enumMEcommerceStatus("m_ecommerce_status"),
    replayByMerchant: enumZeroOne("replay_by_merchant"),
    mEcommerceCloseReason: text("m_ecommerce_close_reason"),
    mEcommerceLastUpdate: timestamp("m_ecommerce_last_update", { withTimezone: true }),
    mEcommerceCreateDate: timestamp("m_ecommerce_create_date", { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index("_message_ecommerce_status").on(
      t.mEcommerceType,
      t.mEcommerceSection,
      t.mEcommerceStatus,
    ),
    idIdx: index("_message_ecommerce_id").on(t.customerId, t.merchantId),
  }),
);

export type MessageEcommerce = typeof messageEcommerceTable.$inferSelect;
export type NewMessageEcommerce = typeof messageEcommerceTable.$inferInsert;
