import { pgTable, bigint, text, timestamp, index } from "drizzle-orm/pg-core";
import { enumMessageType, enumMessageSection, enumMessageStatus, enumMessageReplay } from "./enums";

export const messageTable = pgTable(
  "_message",
  {
    messageId: bigint("message_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    messageType: enumMessageType("message_type").notNull(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    merchantId: bigint("merchant_id", { mode: "number" }).notNull(),
    ppobCatId: bigint("ppob_cat_id", { mode: "number" }),
    messageRefid: bigint("message_refid", { mode: "number" }),
    messageSection: enumMessageSection("message_section").notNull(),
    messageStatus: enumMessageStatus("message_status").notNull().default("open"),
    replayByAdmin: enumMessageReplay("replay_by_admin").notNull(),
    messageCloseReason: text("message_close_reason").notNull(),
    messageLastUpdate: timestamp("message_last_update", { withTimezone: true }).notNull(),
    messageCreateDate: timestamp("message_create_date", { withTimezone: true }).notNull(),
  },
  (t) => ({
    customerIdIdx: index("_message_customer_id").on(t.customerId),
    merchantIdIdx: index("_message_merchant_id").on(t.merchantId),
    ppobCatIdIdx: index("_message_ppob_cat_id").on(t.ppobCatId),
    messageRefidIdx: index("_message_message_refid").on(t.messageRefid),
    messageTypeIdx: index("_message_message_type").on(t.messageType),
    messageSectionIdx: index("_message_message_section").on(t.messageSection),
    messageStatusIdx: index("_message_message_status").on(t.messageStatus),
    replayByAdminIdx: index("_message_replay_by_admin").on(t.replayByAdmin),
    messageLastUpdateIdx: index("_message_message_last_update").on(t.messageLastUpdate.desc()),
    messageCreateDateIdx: index("_message_message_create_date").on(t.messageCreateDate.desc()),
  }),
);

export type Message = typeof messageTable.$inferSelect;
export type NewMessage = typeof messageTable.$inferInsert;
