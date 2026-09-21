import { pgTable, bigint, varchar, text, timestamp, index, numeric } from "drizzle-orm/pg-core";
import { enumAddsCondition, enumAddsStatus, enumZeroOne } from "./enums";

export const addsTable = pgTable(
  "_adds",
  {
    addsId: bigint("adds_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    catId: bigint("cat_id", { mode: "number" }).notNull(),
    addsCode: bigint("adds_code", { mode: "number" }).notNull(),
    addsTitle: varchar("adds_title", { length: 100 }).notNull().default(""),
    addsAlias: varchar("adds_alias", { length: 100 }).notNull().default(""),
    addsDesc: text("adds_desc").notNull(),
    addsProvince: varchar("adds_province", { length: 50 }).notNull(),
    addsCity: varchar("adds_city", { length: 50 }).notNull(),
    addsDistrict: varchar("adds_district", { length: 50 }).notNull(),
    addsSubdistrict: varchar("adds_subdistrict", { length: 50 }).notNull(),
    addsAddress: text("adds_address").notNull(),
    addsCondition: enumAddsCondition("adds_condition").notNull(),
    addsPrice: numeric("adds_price", { precision: 8, scale: 2 }).notNull(),
    addsTags: text("adds_tags").notNull(),
    addsPremium: enumZeroOne("adds_premium").notNull().default("0"),
    addsPremiumExpired: timestamp("adds_pemium_expired", { withTimezone: true }),
    addsStatus: enumAddsStatus("adds_status").notNull().default("publish"),
    addsReady: enumZeroOne("adds_ready").notNull().default("1"),
    addsSeen: bigint("adds_seen", { mode: "number" }).notNull(),
    addsSeenId: bigint("adds_seen_id", { mode: "number" }).notNull(),
    addsContacted: bigint("adds_contacted", { mode: "number" }).notNull(),
    addsContactedId: bigint("adds_contacted_id", { mode: "number" }).notNull(),
    addsCreateDate: timestamp("adds_create_date", { withTimezone: true }).notNull(),
    addsUpdateDate: timestamp("adds_update_date", { withTimezone: true }),
    addsUpdateCount: bigint("adds_update_count", { mode: "number" }).notNull().default(0),
    addsReasonBlock: text("adds_reason_block").notNull(),
  },
  (t) => ({
    contactedIdIdx: index("_adds_adds_contacted_id").on(t.addsContactedId),
    seenIdIdx: index("_adds_adds_seen_id").on(t.addsSeenId),
    catIdIdx: index("_adds_cat_id").on(t.catId),
    customerIdIdx: index("_adds_customer_id").on(t.customerId),
    statusIdx: index("_adds_status").on(t.addsStatus),
  }),
);

export type Adds = typeof addsTable.$inferSelect;
export type NewAdds = typeof addsTable.$inferInsert;
