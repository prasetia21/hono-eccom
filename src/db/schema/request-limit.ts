import {
  pgTable,
  bigint,
  varchar,
  text,
  timestamp,
  index,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
import { enumRLimitStatus } from "./enums";

export const pengajuanLimitTable = pgTable(
  "_request_limit",
  {
    id: bigint("r_limit_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    cWhitelabelId: bigint("c_whitelabel_id", { mode: "number" }),
    customerId: bigint("customer_id", { mode: "number" }),
    rLimitKey: varchar("r_limit_key", { length: 255 }),
    rLimitNominal: numeric("r_limit_nominal", { precision: 10, scale: 2 }),
    tfSaldoTotal: numeric("tf_saldo_total", { precision: 10, scale: 2 }),
    tfUangTotal: numeric("tf_uang_total", { precision: 10, scale: 2 }),
    emoneyTotal: numeric("emoney_total", { precision: 10, scale: 2 }),
    omsetTotal: numeric("omset_total", { precision: 10, scale: 2 }),
    omsetActual: numeric("omset_actual", { precision: 10, scale: 2 }),
    omsetWeek: numeric("omset_week", { precision: 10, scale: 2 }),
    emoneyPercent: numeric("emoney_percent"),
    tfUangPercent: numeric("tf_uang_percent"),
    rLimitRecomendation: integer("r_limit_recomendation"),
    rLimitEditedBy: varchar("r_limit_edited_by", { length: 255 }),
    rLimitSignature: varchar("r_limit_signature", { length: 255 }),
    rLimitStatus: enumRLimitStatus("r_limit_status").default("pending"),
    rLimitUpdateDate: timestamp("r_limit_update_date", { withTimezone: true }),
    rLimitUpdateNote: text("r_limit_update_note"),
    rLimitCreateDate: timestamp("r_limit_create_date", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    whitelabelIdx: index("_request_limit_c_whitelabel_id").on(t.cWhitelabelId),
    customerIdx: index("_request_limit_customer_id").on(t.customerId),
    createDateIdx: index("_request_limit_r_limit_create_date").on(t.rLimitCreateDate),
  }),
);

export type PengajuanLimit = typeof pengajuanLimitTable.$inferSelect;
export type NewPengajuanLimit = typeof pengajuanLimitTable.$inferInsert;
