import { pgTable, bigint, varchar, text } from "drizzle-orm/pg-core";
import { enumZeroOne, enumAttrFormType } from "./enums";

export const productAttributeTable = pgTable("_product_attribute", {
  attrId: bigint("attr_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  catId: bigint("cat_id", { mode: "number" }).notNull(),
  attrName: varchar("attr_name", { length: 50 }).notNull(),
  attrAlias: varchar("attr_alias", { length: 50 }).notNull(),
  attrFormType: enumAttrFormType("attr_form_type").notNull(),
  attrValue: text("attr_value").notNull(),
  attrDefaultValue: varchar("attr_default_value", { length: 100 }).notNull(),
  attrValidate: text("attr_validate").notNull(),
  attrStatus: enumZeroOne("attr_status").notNull().default("1"),
  attrOrder: bigint("attr_order", { mode: "number" }).notNull().default(1),
  isSearch: enumZeroOne("is_search").notNull().default("0"),
  isStock: enumZeroOne("is_stock").notNull().default("0"),
  attrCreate: enumZeroOne("attr_create").notNull().default("0"),
});

export type ProductAttribute = typeof productAttributeTable.$inferSelect;
export type NewProductAttribute = typeof productAttributeTable.$inferInsert;
