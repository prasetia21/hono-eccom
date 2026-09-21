import { pgTable, bigint, varchar, text, index } from "drizzle-orm/pg-core";

export const settingTable = pgTable(
  "_setting",
  {
    settingId: bigint("setting_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    settingType: varchar("setting_type", { length: 20 }).notNull(),
    settingName: varchar("setting_name", { length: 100 }).notNull(),
    settingValue: text("setting_value").notNull(),
  },
  (t) => ({
    checkIdx: index("_setting_check").on(t.settingType, t.settingName),
    nameIdx: index("_setting_name").on(t.settingName),
    typeIdx: index("_setting_type").on(t.settingType),
  }),
);

export type Setting = typeof settingTable.$inferSelect;
export type NewSetting = typeof settingTable.$inferInsert;
