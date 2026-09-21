import { pgTable, bigint, varchar, index, text, timestamp } from "drizzle-orm/pg-core";
import { enumPmTopupMetodePay } from "@/db/schema/enums.ts";

export const picTable = pgTable(
  "_pic",
  {
    picId: bigint("pic_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    picName: varchar("pic_name", { length: 100 }).notNull(),
    picEmail: varchar("pic_email", { length: 30 }).notNull(),
    picPhone: varchar("pic_phone", { length: 20 }).notNull(),
    picAddress: text("pic_address").notNull(),
    picStatus: enumPmTopupMetodePay("pic_status").notNull(),
    picCreateDate: timestamp("pic_create_date", { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index("_pic_status").on(t.picStatus),
  }),
);

export type Pic = typeof picTable.$inferSelect;
export type NewPic = typeof picTable.$inferInsert;
