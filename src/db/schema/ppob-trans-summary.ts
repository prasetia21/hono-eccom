import {
  pgTable,
  bigint,
  text,
  timestamp,
  index,
  uniqueIndex,
  numeric,
  date,
} from "drizzle-orm/pg-core";

export const ppobTransSummaryTable = pgTable(
  "_ppob_trans_summary",
  {
    ptSummaryId: bigint("pt_summary_id", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    ptSummaryCount: bigint("pt_summary_count", { mode: "number" }).notNull(),
    ptSummaryDate: date("pt_summary_date").notNull(),
    ptSummaryStartDate: date("pt_summary_start_date"),
    ptSummaryEndDate: date("pt_summary_end_date"),
    ptSummaryKey: text("pt_summary_key").notNull(),
    ptSummaryPrice: numeric("pt_summary_price", { precision: 10, scale: 2 }).default("0").notNull(),
    ptSummaryAdmin: numeric("pt_summary_admin", { precision: 10, scale: 2 }).default("0").notNull(),
    ptSummaryMarginCompany: numeric("pt_summary_margin_company", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ptSummaryMarginMaster: numeric("pt_summary_margin_master", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ptSummaryMarginDealer: numeric("pt_summary_margin_dealer", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ptSummaryMarkupCompany: numeric("pt_summary_markup_company", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ptSummaryMarkupMaster: numeric("pt_summary_markup_master", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ptSummaryMarkupDealer: numeric("pt_summary_markup_dealer", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ptSummaryCashbackCompany: numeric("pt_summary_cashback_company", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ptSummaryCashbackMaster: numeric("pt_summary_cashback_master", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ptSummaryCashbackDealer: numeric("pt_summary_cashback_dealer", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ptSummaryCashbackTrans: numeric("pt_summary_cashback_trans", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ptSummaryCreateDate: timestamp("pt_summary_create_date", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    customerIdUniqueIdx: uniqueIndex("_ppob_trans_summary_customer_id").on(t.customerId),
    amountIdx: index("_ppob_trans_summary_price").on(
      t.ptSummaryPrice,
      t.ptSummaryAdmin,
      t.ptSummaryMarginCompany,
      t.ptSummaryMarginMaster,
      t.ptSummaryMarginDealer,
      t.ptSummaryMarkupCompany,
      t.ptSummaryMarkupMaster,
      t.ptSummaryMarkupDealer,
      t.ptSummaryCashbackCompany,
      t.ptSummaryCashbackMaster,
      t.ptSummaryCashbackDealer,
      t.ptSummaryCashbackTrans,
    ),
  }),
);

export type PpobTransSummary = typeof ppobTransSummaryTable.$inferSelect;
export type NewPpobTransSummary = typeof ppobTransSummaryTable.$inferInsert;
