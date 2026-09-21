import { bigint, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { enumZeroOne } from "@/db/schema/enums";

export const shipmentCitySicepatTable = pgTable("_shipment_city_sicepat", {
  scSicepatId: bigint("sc_sicepat_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  rCityId: integer("r_city_id"),
  scSicepatCode: varchar("sc_sicepat_code", { length: 50 }),
  scSicepatProvince: varchar("sc_sicepat_province", { length: 255 }),
  scSicepatCity: varchar("sc_sicepat_city", { length: 255 }),
  scSicepatDistrict: varchar("sc_sicepat_district", { length: 255 }),
  scSicepatCod: enumZeroOne("sc_sicepat_cod").default("0"),
  scSicepatCreateDate: timestamp("sc_sicepat_create_date", { withTimezone: true }).defaultNow(),
});

export type ShipmentCitySicepat = typeof shipmentCitySicepatTable.$inferSelect;
export type NewShipmentCitySicepat = typeof shipmentCitySicepatTable.$inferInsert;
