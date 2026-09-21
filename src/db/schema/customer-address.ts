import { pgTable, bigint, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { enumZeroOne } from "@/db/schema/enums.ts";

export const customerAddressTable = pgTable(
  "_customer_address",
  {
    cAddressId: bigint("c_address_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    rCityId: bigint("r_city_id", { mode: "number" }),
    cAddressType: varchar("c_address_type", { length: 200 }),
    cAddressName: varchar("c_address_name", { length: 200 }),
    cAddressPhone: varchar("c_address_phone", { length: 20 }),
    cAddressAddress: text("c_address_address"),
    cAddressPrimary: enumZeroOne("c_address_primary").default("0"),
    cAddressPrimaryMerchant: enumZeroOne("c_address_primary_merchant").default("0"),
    cAddressLatitude: varchar("c_address_latitude", { length: 20 }),
    cAddressLongitude: varchar("c_address_longitude", { length: 20 }),
    cAddressCreateDate: timestamp("c_address_create_date", { withTimezone: true }),
  },
  (t) => ({
    customerIdIdx: index("_customer_address_customer_id").on(t.customerId),
    rCityIdIdx: index("_customer_address_r_city_id").on(t.rCityId),
    cAddressPrimaryIdx: index("_customer_address_primary").on(t.cAddressPrimary),
    cAddressPrimaryMerchantIdx: index("_customer_address_primary_merchant").on(
      t.cAddressPrimaryMerchant,
    ),
    statusIdx: index("_customer_address_status").on(t.cAddressPrimary, t.cAddressPrimaryMerchant),
  }),
);

export type CustomerAddress = typeof customerAddressTable.$inferSelect;
export type NewCustomerAddress = typeof customerAddressTable.$inferInsert;
