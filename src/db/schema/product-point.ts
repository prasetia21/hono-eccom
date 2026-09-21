import { pgTable, bigint, timestamp } from "drizzle-orm/pg-core";

export const productPointTable = pgTable("_product_point", {
  pPointId: bigint("p_point_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  productId: bigint("product_id", { mode: "number" }),
  pPointCreate: bigint("p_point_create", { mode: "number" }).default(0),
  pPointUpdate: bigint("p_point_update", { mode: "number" }).default(0),
  pPointHit: bigint("p_point_hit", { mode: "number" }).default(0),
  pPointFavorite: bigint("p_point_favorite", { mode: "number" }).default(0),
  pPointCart: bigint("p_point_cart", { mode: "number" }).default(0),
  pPointBuy: bigint("p_point_buy", { mode: "number" }).default(0),
  pPointRating: bigint("p_point_rating", { mode: "number" }).default(0),
  pPointAge: bigint("p_point_age", { mode: "number" }).default(0),
  pPointTotal: bigint("p_point_total", { mode: "number" }).default(0),
  pPointUpdateDate: timestamp("p_point_update_date", { withTimezone: true }),
  pPointAgeDate: timestamp("p_point_age_date", { withTimezone: true }),
  pPointResetDate: timestamp("p_point_reset_date", { withTimezone: true }),
  pPointCreateDate: timestamp("p_point_create_date", { withTimezone: true }).defaultNow(),
});

export type ProductPoint = typeof productPointTable.$inferSelect;
export type NewProductPoint = typeof productPointTable.$inferInsert;
