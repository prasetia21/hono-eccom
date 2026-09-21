import { pgTable, bigint, varchar } from "drizzle-orm/pg-core";
import { enumZeroOne } from "@/db/schema/enums";

export const shippingExpedisiTable = pgTable("_shipping_expedisi", {
  expedisiId: bigint("expedisi_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  expedisiGroup: varchar("expedisi_group", { length: 10 }).notNull(),
  expedisiName: varchar("expedisi_name", { length: 100 }).notNull(),
  expedisiAlias: varchar("expedisi_alias", { length: 100 }).notNull(),
  expedisiPhone: varchar("expedisi_phone", { length: 50 }).notNull(),
  expedisiImage: varchar("expedisi_image", { length: 100 }).notNull(),
  expedisiStatus: enumZeroOne("expedisi_status").notNull(),
  expedisiOrder: bigint("expedisi_order", { mode: "number" }).notNull(),
});

export type ShippingExpedisi = typeof shippingExpedisiTable.$inferSelect;
export type NewShippingExpedisi = typeof shippingExpedisiTable.$inferInsert;
