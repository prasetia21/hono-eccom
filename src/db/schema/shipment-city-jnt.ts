import { bigint, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const shipmentCityJntTable = pgTable("_shipment_city_jnt", {
  scJntId: bigint("sc_jnt_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  rCityId: integer("r_city_id"),
  scJntCode: varchar("sc_jnt_code", { length: 50 }),
  scJntProvince: varchar("sc_jnt_province", { length: 255 }),
  scJntCity: varchar("sc_jnt_city", { length: 255 }),
  scJntSubdistrict: varchar("sc_jnt_subdistrict", { length: 255 }),
  scJntCreateDate: timestamp("sc_jnt_create_date", { withTimezone: true }).defaultNow(),
});

export type ShipmentCityJnt = typeof shipmentCityJntTable.$inferSelect;
export type NewShipmentCityJnt = typeof shipmentCityJntTable.$inferInsert;
