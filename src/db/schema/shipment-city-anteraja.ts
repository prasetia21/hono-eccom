import { bigint, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const shipmentCityAnterajaTable = pgTable("_shipment_city_anteraja", {
  scAnterajaId: bigint("sc_anteraja_id", { mode: "number" })
    .generatedAlwaysAsIdentity()
    .primaryKey(),
  rCityId: integer("r_city_id"),
  scAnterajaCode: varchar("sc_anteraja_code", { length: 50 }),
  scAnterajaProvince: varchar("sc_anteraja_province", { length: 255 }),
  scAnterajaCity: varchar("sc_anteraja_city", { length: 255 }),
  scAnterajaDistrict: varchar("sc_anteraja_district", { length: 255 }),
  scAnterajaCreateDate: timestamp("sc_anteraja_create_date", { withTimezone: true }).defaultNow(),
});

export type ShipmentCityAnteraja = typeof shipmentCityAnterajaTable.$inferSelect;
export type NewShipmentCityAnteraja = typeof shipmentCityAnterajaTable.$inferInsert;
