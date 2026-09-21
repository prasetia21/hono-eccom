import { pgTable, bigint, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { enumZeroOne, enumContentStatus, enumContentType } from "./enums";

export const contentTable = pgTable(
  "_content",
  {
    contentId: bigint("content_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    sectionId: bigint("section_id", { mode: "number" }).notNull(),
    mallId: bigint("mall_id", { mode: "number" }).notNull(),
    catId: varchar("cat_id", { length: 50 }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    contentName: varchar("content_name", { length: 200 }).notNull(),
    contentAlias: varchar("content_alias", { length: 200 }).notNull(),
    contentAltImage: text("content_alt_image"),
    contentSortdesc: text("content_sortdesc").notNull(),
    contentDesc: text("content_desc").notNull(),
    contentTags: text("content_tags").notNull(),
    contentHits: bigint("content_hits", { mode: "number" }).notNull(),
    contentSliderWl: enumZeroOne("content_slider_wl").default("0"),
    contentStatus: enumContentStatus("content_status").notNull(),
    contentCreateDate: timestamp("content_create_date", { withTimezone: true }).notNull(),
    contentPublishDate: timestamp("content_publish_date", { withTimezone: true }),
    contentType: enumContentType("content_type").default("ebelanja"),
    contentMetaTitle: varchar("content_meta_title", { length: 255 }),
    contentMetaDescription: text("content_meta_description"),
    contentMetaKeyword: varchar("content_meta_keyword", { length: 255 }),
  },
  (t) => ({
    catIdIdx: index("_content_cat_id").on(t.catId),
    contentCreateDateIdx: index("_content_content_create_date").on(t.contentCreateDate.desc()),
    contentPublishDateIdx: index("_content_content_publish_date").on(t.contentPublishDate.desc()),
    contentStatusIdx: index("_content_content_status").on(t.contentStatus),
    contentTypeIdx: index("_content_content_type").on(t.contentType),
    mallIdIdx: index("_content_mall_id").on(t.mallId),
    sectionIdIdx: index("_content_section_id").on(t.sectionId),
    userIdIdx: index("_content_user_id").on(t.userId),
  }),
);

export type Content = typeof contentTable.$inferSelect;
export type NewContent = typeof contentTable.$inferInsert;
