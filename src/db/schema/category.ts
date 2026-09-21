import { pgTable, bigint, varchar, text, index } from "drizzle-orm/pg-core";

import { enumZeroOne } from "./enums";

export const categoryTable = pgTable(
  "_category",
  {
    catId: bigint("cat_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    sectionId: bigint("section_id", { mode: "number" }).notNull(),
    catName: varchar("cat_name", { length: 100 }).notNull(),
    catAlias: varchar("cat_alias", { length: 100 }).notNull(),
    catDesc: text("cat_desc").notNull(),
    catImage: varchar("cat_image", { length: 100 }).notNull(),
    catHits: bigint("cat_hits", { mode: "number" }).notNull(),
    catParent: bigint("cat_parent", { mode: "number" }).notNull(),
    catLevel: bigint("cat_level", { mode: "number" }).notNull(),
    catStatus: enumZeroOne("cat_status").default("1").notNull(),
    catRoot: varchar("cat_root", { length: 30 }).notNull(),
    catOrder: bigint("cat_order", { mode: "number" }).notNull(),
  },
  (table) => ({
    catAliasIdx: index("_category_cat_alias").on(table.catAlias),
    catParentIdx: index("_category_cat_parent").on(table.catParent),
    catStatusIdx: index("_category_cat_status").on(table.catStatus),
    sectionIdIdx: index("_category_section_id").on(table.sectionId),
  }),
);

export type Category = typeof categoryTable.$inferSelect;
export type NewCategory = typeof categoryTable.$inferInsert;
