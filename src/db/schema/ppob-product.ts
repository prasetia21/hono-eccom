import { pgTable, bigint, varchar, text, timestamp, index, numeric } from "drizzle-orm/pg-core";
import {
  enumPpobModel,
  enumPpobType,
  enumPpobStatusTransaction,
  enumBannerStatus,
  enumZeroOne,
} from "./enums";
import { sql } from "drizzle-orm";

export const ppobProductTable = pgTable(
  "_ppob_product",
  {
    ppobId: bigint("ppob_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    catId: bigint("cat_id", { mode: "number" }).notNull(),
    ppobCode: varchar("ppob_code", { length: 20 }).notNull(),
    ppobName: varchar("ppob_name", { length: 150 }).notNull(),
    ppobNominal: varchar("ppob_nominal", { length: 10 }).default(sql`NULL`),
    ppobDesc: text("ppob_desc").notNull(),
    ppobImage: varchar("ppob_image", { length: 100 }).notNull(),
    ppobModel: enumPpobModel("ppob_model").notNull(),
    ppobType: enumPpobType("ppob_type"),
    ppobMargin: numeric("ppob_margin", { precision: 8, scale: 2 }).notNull(),
    ppobCashback: numeric("ppob_cashback", { precision: 8, scale: 2 }).notNull(),
    ppobPrice: numeric("ppob_price", { precision: 8, scale: 2 }).notNull(),
    ppobPriceUpdateDate: timestamp("ppob_price_update_date", { withTimezone: true }),
    ppobPriceUpdateBy: bigint("ppob_price_update_by", { mode: "number" }).notNull(),
    ppobAdminBank: bigint("ppob_admin_bank", { mode: "number" }).notNull(),
    ppobStatusPublish: enumBannerStatus("ppob_status_publish").notNull(),
    ppobStatusTransaction: enumPpobStatusTransaction("ppob_status_transaction").default("normal"),
    ppobStatusPromo: enumZeroOne("ppob_status_promo").default("0"),
    ppobCreateBy: bigint("ppob_create_by", { mode: "number" }).notNull(),
    ppobCreateDate: timestamp("ppob_create_date", { withTimezone: true }).notNull(),
    ppobStatusPromoWeb: enumZeroOne("ppob_status_promo_web").default("0"),
  },
  (t) => ({
    catIdIdx: index("_ppob_product_cat_id").on(t.catId),
    codeIdx: index("_ppob_product_code").on(t.ppobCode),
    nameIdx: index("_ppob_product_name").on(t.ppobName),
    createDateIdx: index("_ppob_product_ppob_create_date").on(t.ppobCreateDate.desc()),
    statusPromoIdx: index("_ppob_product_ppob_status_promo").on(t.ppobStatusPromo),
    statusIdx: index("_ppob_product_status").on(t.ppobStatusPublish),
  }),
);

export type PpobProduct = typeof ppobProductTable.$inferSelect;
export type NewPpobProduct = typeof ppobProductTable.$inferInsert;
