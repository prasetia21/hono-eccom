import { pgTable, bigint, varchar, text, numeric, index } from "drizzle-orm/pg-core";
import { enumZeroOne, enumPmTopupMetodePay, enumCatPlatform } from "./enums";

export const productCategoryTable = pgTable(
  "_product_category",
  {
    catId: bigint("cat_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    catName: varchar("cat_name", { length: 100 }).notNull(),
    catAlias: varchar("cat_alias", { length: 100 }).notNull(),
    catDesc: text("cat_desc").notNull(),
    catImage: varchar("cat_image", { length: 100 }).notNull(),
    catHits: bigint("cat_hits", { mode: "number" }).notNull(),
    catParent: bigint("cat_parent", { mode: "number" }).notNull(),
    catLevel: bigint("cat_level", { mode: "number" }).notNull(),
    catStatus: enumZeroOne("cat_status").notNull().default("1"),
    catRoot: varchar("cat_root", { length: 30 }).notNull(),
    catOrder: bigint("cat_order", { mode: "number" }).notNull(),
    isOptionRequired: enumZeroOne("is_option_required").notNull().default("0"),
    catShipmentMargin: numeric("cat_shipment_margin").notNull(),
    catPickupMargin: numeric("cat_pickup_margin").notNull(),
    catFavorite: enumPmTopupMetodePay("cat_favorite").default("0"),
    catPlatform: enumCatPlatform("cat_platform").default("ebelanja"),
  },
  (t) => ({
    platformIdx: index("_product_category__product_category__platform").on(t.catPlatform),
    idIdx: index("_product_category_id").on(t.catParent),
    nameIdx: index("_product_category_name").on(t.catName),
    statusIdx: index("_product_category_status").on(t.catStatus),
  }),
);

export type ProductCategory = typeof productCategoryTable.$inferSelect;
export type NewProductCategory = typeof productCategoryTable.$inferInsert;
