import { bigint, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import {
  enumStatus1660,
  enumPromoPaymentMethod,
  enumPromoSection,
  enumZeroOne,
  enumPromoType,
  enumPromoTypeValue,
  enumPromoVisible,
} from "@/db/schema/enums";

export const promoTable = pgTable("_promo", {
  promoId: bigint("promo_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  catId: bigint("cat_id", { mode: "number" }),
  productId: bigint("product_id", { mode: "number" }),
  promoPeriode: bigint("promo_periode", { mode: "number" }).default(1),
  promoSection: enumPromoSection("promo_section").default("cashback"),
  promoTypeValue: enumPromoTypeValue("promo_type_value").notNull(),
  promoType: enumPromoType("promo_type"),
  promoName: varchar("promo_name", { length: 250 }).notNull(),
  promoAlias: varchar("promo_alias", { length: 250 }).notNull(),
  promoDesc: text("promo_desc"),
  promoImage: varchar("promo_image", { length: 255 }),
  promoMinPayment: numeric("promo_min_payment", { precision: 10, scale: 2 }),
  promoMaxDiscount: numeric("promo_max_discount", { precision: 8, scale: 2 }),
  promoPaymentMethod: enumPromoPaymentMethod("promo_payment_method"),
  promoValue: numeric("promo_value", { precision: 8, scale: 2 }),
  promoCode: varchar("promo_code", { length: 15 }),
  promoQty: bigint("promo_qty", { mode: "number" }),
  promoUsed: bigint("promo_used", { mode: "number" }).default(0).notNull(),
  promoStartDate: timestamp("promo_start_date", { withTimezone: true }).notNull(),
  promoEndDate: timestamp("promo_end_date", { withTimezone: true }).notNull(),
  promoVisible: enumPromoVisible("promo_visible").default("public"),
  promoStatus: enumStatus1660("promo_status"),
  promoSlider: enumZeroOne("promo_slider"),
  promoTermCondition: text("promo_term_condition"),
  promoCreateBy: bigint("promo_create_by", { mode: "number" }).notNull(),
  promoCreateDate: timestamp("promo_create_date", { withTimezone: true }).defaultNow().notNull(),
});

export type Promo = typeof promoTable.$inferSelect;
export type NewPromo = typeof promoTable.$inferInsert;
