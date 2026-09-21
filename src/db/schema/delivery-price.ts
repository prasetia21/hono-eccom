import { pgTable, bigint, timestamp, index, numeric } from "drizzle-orm/pg-core";
import { enumStatus1660 } from "./enums";

export const deliveryPriceTable = pgTable(
  "_delivery_price",
  {
    dPriceId: bigint("d_price_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    dPriceFrom: bigint("d_price_from", { mode: "number" }).notNull(),
    dPriceTo: bigint("d_price_to", { mode: "number" }).notNull(),
    dPriceCost: numeric("d_price_cost", { precision: 8, scale: 2 }).notNull(),
    dPriceStatus: enumStatus1660("d_price_status").notNull(),
    dPriceCreateDate: timestamp("d_price_create_date", { withTimezone: true }).notNull(),
  },
  (t) => ({
    dPriceFromIdx: index("_delivery_price_from").on(t.dPriceFrom),
    dPriceToIdx: index("_delivery_price_to").on(t.dPriceTo),
    dPriceStatusIdx: index("_delivery_price_status").on(t.dPriceStatus),
    allIdx: index("_delivery_price_all").on(t.dPriceFrom, t.dPriceTo, t.dPriceStatus),
  }),
);

export type DeliveryPrice = typeof deliveryPriceTable.$inferSelect;
export type NewDeliveryPrice = typeof deliveryPriceTable.$inferInsert;
