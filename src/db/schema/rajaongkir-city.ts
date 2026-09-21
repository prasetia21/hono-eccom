import { pgTable, bigint, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const rajaongkirCityTable = pgTable(
  "_rajaongkir_city",
  {
    rCityId: bigint("r_city_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    provinceId: bigint("province_id", { mode: "number" }),
    cityId: bigint("city_id", { mode: "number" }),
    subdistrictId: bigint("subdistrict_id", { mode: "number" }),
    rCityProvince: varchar("r_city_province", { length: 150 }),
    rCityName: varchar("r_city_name", { length: 150 }),
    rCitySubdistrict: varchar("r_city_subdistrict", { length: 150 }),
    rCityPostcode: varchar("r_city_postcode", { length: 10 }),
    rCityCreateDate: timestamp("r_city_create_date", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    cityIdIdx: index("_rajaongkir_city_city_id").on(t.cityId),
    provinceIdIdx: index("_rajaongkir_city_province_id").on(t.provinceId),
    subdistrictIdIdx: index("_rajaongkir_city_subdistrict_id").on(t.subdistrictId),
  }),
);

export type RajaongkirCity = typeof rajaongkirCityTable.$inferSelect;
export type NewRajaongkirCity = typeof rajaongkirCityTable.$inferInsert;
