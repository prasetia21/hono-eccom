import { sql } from "drizzle-orm";
import { pgTable, bigint, varchar, text, index } from "drizzle-orm/pg-core";
import { enumCatModel, enumCatType, enumCatStatusFee, enumZeroOne } from "./enums";

export const ppobCategoryTable = pgTable(
  "_ppob_category",
  {
    catId: bigint("cat_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    sectionId: bigint("section_id", { mode: "number" }).notNull(),
    catName: varchar("cat_name", { length: 100 }).notNull(),
    catAlias: varchar("cat_alias", { length: 100 }).notNull(),
    catDesc: text("cat_desc").notNull(),
    catModel: enumCatModel("cat_model").notNull(),
    catType: enumCatType("cat_type").notNull(),
    catStatusFee: enumCatStatusFee("cat_status_fee"),
    catImage: varchar("cat_image", { length: 100 }).notNull(),
    catHits: bigint("cat_hits", { mode: "number" }).notNull(),
    catParent: bigint("cat_parent", { mode: "number" }).notNull(),
    catLevel: bigint("cat_level", { mode: "number" }).notNull(),
    catYoutubeUrl: text("cat_youtube_url"),
    catStatus: enumZeroOne("cat_status").notNull().default("1"),
    catRoot: varchar("cat_root", { length: 30 }).notNull(),
    catOrder: bigint("cat_order", { mode: "number" }).notNull(),
    catFavorite: bigint("cat_favorite", { mode: "number" })
      .notNull()
      .default(sql`'0'`),
    catMetaTitle: varchar("cat_meta_title", { length: 255 }),
    catMetaDescription: text("cat_meta_description"),
    catMetaKeyword: varchar("cat_meta_keyword", { length: 255 }),
    catImageBanner: varchar("cat_image_banner", { length: 255 }),
  },
  (t) => ({
    aliasIdx: index("_ppob_category_alias").on(t.catAlias),
    catNameIdx: index("_ppob_category_cat_name").on(t.catName),
    catParentIdx: index("_ppob_category_cat_parent").on(t.catParent),
    favoriteIdx: index("_ppob_category_favorite").on(t.catFavorite),
    sectionIdIdx: index("_ppob_category_section_id").on(t.sectionId),
    statusIdx: index("_ppob_category_status").on(t.catStatus),
  }),
);

export type PpobCategory = typeof ppobCategoryTable.$inferSelect;
export type NewPpobCategory = typeof ppobCategoryTable.$inferInsert;
