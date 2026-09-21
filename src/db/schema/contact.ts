import { pgTable, bigint, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { enumContactStatus } from "./enums";

export const contactTable = pgTable(
  "_contact",
  {
    contactId: bigint("contact_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    contactName: varchar("contact_name", { length: 150 }),
    contactEmail: varchar("contact_email", { length: 150 }),
    contactSubject: varchar("contact_subject", { length: 100 }),
    contactText: text("contact_text"),
    userId: bigint("user_id", { mode: "number" }),
    contactStatus: enumContactStatus("contact_status").notNull().default("new"),
    contactReplySubject: varchar("contact_reply_subject", { length: 50 }).default("new"),
    contactReplyText: text("contact_reply_text"),
    contactReplyDate: timestamp("contact_reply_date", { withTimezone: true }),
    contactForwardEmail: varchar("contact_forward_email", { length: 50 }),
    contactForwardSubject: varchar("contact_forward_subject", { length: 50 }),
    contactForwardText: text("contact_forward_text"),
    contactForwardDate: timestamp("contact_forward_date", { withTimezone: true }),
    contactCreateDate: timestamp("contact_create_date", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userIdIdx: index("_contact_user_id").on(t.userId),
  }),
);

export type Contact = typeof contactTable.$inferSelect;
export type NewContact = typeof contactTable.$inferInsert;
