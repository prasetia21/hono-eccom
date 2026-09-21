import { pgTable, bigint, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

export const orderTrackingTable = pgTable(
  "_order_tracking",
  {
    trackingId: bigint("tracking_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    orderId: bigint("order_id", { mode: "number" }).notNull(),
    trackingTitle: varchar("tracking_title", { length: 255 }).notNull(),
    trackingDesc: text("tracking_desc"),
    trackingDate: timestamp("tracking_date", { withTimezone: true }),
    trackingStatus: varchar("tracking_status", { length: 50 }).default("deliver"),
    trackingCreateDate: timestamp("tracking_create_date", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    orderIdIdx: index("_order_tracking_order_id").on(t.orderId),
  }),
);

export type OrderTracking = typeof orderTrackingTable.$inferSelect;
export type NewOrderTracking = typeof orderTrackingTable.$inferInsert;
