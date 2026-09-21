import { pgTable, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { productCategoryTable } from "./product-category";
import { enumPcRecommendStatus } from "./enums";

export const productCategoryRecommendationTable = pgTable("_product_category_recommendation", {
  pcRecommendId: integer("pc_recommend_id").generatedAlwaysAsIdentity().primaryKey(),
  catId: integer("cat_id")
    .notNull()
    .references(() => productCategoryTable.catId, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  pcOrderKey: integer("pc_order_key").notNull(),
  pcRecommendImage: varchar("pc_recommend_image", { length: 255 }),
  pcRecommendStatus: enumPcRecommendStatus("pc_recommend_status").default("0"),
  pcRecommendCreateDate: timestamp("pc_recommend_create_date"),
  pcRecommendUpdateDate: timestamp("pc_recommend_update_date"),
});

export type ProductCategoryRecommendation = typeof productCategoryRecommendationTable.$inferSelect;
export type NewProductCategoryRecommendation =
  typeof productCategoryRecommendationTable.$inferInsert;
