import { bigint, index, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const shipmentCityIdexpressTable = pgTable(
  "_shipment_city_idexpress",
  {
    scIdexpressId: bigint("sc_idexpress_id", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    rCityId: integer("r_city_id"),
    scIdexpressProvinceCode: integer("sc_idexpress_province_code"),
    scIdexpressProvinceName: varchar("sc_idexpress_province_name", {
      length: 255,
    }),
    scIdexpressCityCode: integer("sc_idexpress_city_code"),
    scIdexpressCityName: varchar("sc_idexpress_city_name", { length: 255 }),
    scIdexpressDistrictCode: integer("sc_idexpress_district_code"),
    scIdexpressDistrictName: varchar("sc_idexpress_district_name", {
      length: 255,
    }),
    scIdexpressCreateDate: timestamp("sc_idexpress_create_date", {
      withTimezone: true,
    }).defaultNow(),
  },
  (t) => ({
    idxRCityId: index("r_city_id").on(t.rCityId),
  }),
);

export type ShipmentCityIdexpress = typeof shipmentCityIdexpressTable.$inferSelect;
export type NewShipmentCityIdexpress = typeof shipmentCityIdexpressTable.$inferInsert;
