import { pgTable, bigint, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

import { enumZeroOne, enumMediaType } from "./enums";

export const mediaTable = pgTable(
  "_media",
  {
    mediaId: bigint("media_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    sectionId: bigint("section_id", { mode: "number" }),
    dataId: bigint("data_id", { mode: "number" }).notNull(),
    mediaName: varchar("media_name", { length: 250 }).default(""),
    mediaAlias: varchar("media_alias", { length: 250 }).default(""),
    mediaDesc: text("media_desc"),
    mediaType: enumMediaType("media_type").notNull(),
    mediaValue: varchar("media_value", { length: 250 }).default(""),
    mediaSize: varchar("media_size", { length: 10 }).default(""),
    mediaPrimary: enumZeroOne("media_primary").notNull(),
    mediaStatus: enumZeroOne("media_status").notNull(),
    mediaCreateDate: timestamp("media_create_date", { withTimezone: true }),
  },
  (table) => ({
    dataIdIdx: index("_media_data_id").on(table.dataId),
    mediaAliasIdx: index("_media_media_alias").on(table.mediaAlias),
    createDateIdx: index("_media_media_create_date").on(table.mediaCreateDate.desc()),
    primaryIdx: index("_media_media_primary").on(table.mediaPrimary),
    statusIdx: index("_media_media_status").on(table.mediaStatus),
    sectionIdIdx: index("_media_section_id").on(table.sectionId),
  }),
);

export type Media = typeof mediaTable.$inferSelect;
export type NewMedia = typeof mediaTable.$inferInsert;
