import { pgTable, bigint, varchar, timestamp } from "drizzle-orm/pg-core";

export const productPointSettingTable = pgTable("_product_point_setting", {
  ppSettingId: bigint("pp_setting_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  ppSettingName: varchar("pp_setting_name", { length: 255 }),
  ppSettingAlias: varchar("pp_setting_alias", { length: 255 }),
  ppSettingValue: bigint("pp_setting_value", { mode: "number" }),
  ppSettingCreateDate: timestamp("pp_setting_create_date", { withTimezone: true }),
});

export type ProductPointSetting = typeof productPointSettingTable.$inferSelect;
export type NewProductPointSetting = typeof productPointSettingTable.$inferInsert;
