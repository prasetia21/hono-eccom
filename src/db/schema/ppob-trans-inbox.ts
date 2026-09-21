import {
  pgTable,
  bigint,
  varchar,
  text,
  timestamp,
  date,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { enumPpobInjectType, enumZeroOne, enumPpobTransStatus3248 } from "./enums";
import { sql } from "drizzle-orm";

export const ppobTransInboxTable = pgTable(
  "_ppob_trans_inbox",
  {
    ppobTransId: bigint("ppob_trans_id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    whitelabelId: bigint("whitelabel_id", { mode: "number" }).default(sql`'0'`),
    masterId: bigint("master_id", { mode: "number" })
      .notNull()
      .default(sql`'0'`),
    dealerId: bigint("dealer_id", { mode: "number" })
      .notNull()
      .default(sql`'0'`),
    ppobId: bigint("ppob_id", { mode: "number" }).notNull(),
    pvId: bigint("pv_id", { mode: "number" }).notNull(),
    ppobTransTrxId: varchar("ppob_trans_trx_id", { length: 20 }).notNull(),
    ppobTransIdpel1: varchar("ppob_trans_idpel1", { length: 30 }).notNull(),
    ppobTransIdpel2: varchar("ppob_trans_idpel2", { length: 30 }).notNull(),
    ppobTransIdpel3: varchar("ppob_trans_idpel3", { length: 30 }).notNull(),
    ppobTransType: enumPpobInjectType("ppob_trans_type").notNull(),
    ppobTransModel: varchar("ppob_trans_model", { length: 30 }).notNull(),
    ppobTransChannel: text("ppob_trans_channel").notNull(),
    ppobTransBillquantity: bigint("ppob_trans_billquantity", { mode: "number" }).notNull(),
    ppobTransAmount: numeric("ppob_trans_amount", { precision: 8, scale: 2 })
      .notNull()
      .default("0"),
    ppobTransPrice: numeric("ppob_trans_price", { precision: 10, scale: 2 }).notNull(),
    ppobTransAdminBank: numeric("ppob_trans_admin_bank", { precision: 8, scale: 2 }).notNull(),
    ppobTransMargin: numeric("ppob_trans_margin", { precision: 8, scale: 2 }).notNull(),
    ppobTransMarginCompany: numeric("ppob_trans_margin_company", {
      precision: 8,
      scale: 2,
    }).notNull(),
    ppobTransMarginMaster: numeric("ppob_trans_margin_master", {
      precision: 8,
      scale: 2,
    }).notNull(),
    ppobTransMarginDealer: numeric("ppob_trans_margin_dealer", {
      precision: 8,
      scale: 2,
    }).notNull(),
    ppobTransMarkupCompany: numeric("ppob_trans_markup_company", {
      precision: 8,
      scale: 2,
    }).default(sql`'0'`),
    ppobTransMarkupMaster: numeric("ppob_trans_markup_master", { precision: 8, scale: 2 })
      .notNull()
      .default(sql`'0'`),
    ppobTransMarkupDealer: numeric("ppob_trans_markup_dealer", {
      precision: 8,
      scale: 2,
    }).notNull(),
    ppobTransCashback: numeric("ppob_trans_cashback", { precision: 8, scale: 2 }).notNull(),
    ppobTransCashbackCompany: numeric("ppob_trans_cashback_company", {
      precision: 8,
      scale: 2,
    }).notNull(),
    ppobTransCashbackMaster: numeric("ppob_trans_cashback_master", {
      precision: 8,
      scale: 2,
    }).notNull(),
    ppobTransCashbackDealer: numeric("ppob_trans_cashback_dealer", {
      precision: 8,
      scale: 2,
    }).notNull(),
    ppobTransCashbackTrans: numeric("ppob_trans_cashback_trans", {
      precision: 8,
      scale: 2,
    }).notNull(),
    ppobTransPvPrice: numeric("ppob_trans_pv_price", { precision: 8, scale: 2 }).notNull(),
    ppobTransPvAdmin: numeric("ppob_trans_pv_admin", { precision: 8, scale: 2 }).notNull(),
    ppobTransPvCashback: numeric("ppob_trans_pv_cashback", { precision: 8, scale: 2 }).notNull(),
    ppobTransStatus: enumPpobTransStatus3248("ppob_trans_status").notNull().default("pending"),
    ppobRequestSend: enumZeroOne("ppob_request_send").notNull().default("1"),
    ppobTransResponVendorRc: varchar("ppob_trans_respon_vendor_rc", { length: 5 }).notNull(),
    ppobTransResponVendorDesc: text("ppob_trans_respon_vendor_desc").notNull(),
    ppobTransResponRc: varchar("ppob_trans_respon_rc", { length: 5 }).notNull(),
    ppobTransResponDesc: text("ppob_trans_respon_desc").notNull(),
    ppobTransResponNote: text("ppob_trans_respon_note"),
    ppobTransResponVoucher: text("ppob_trans_respon_voucher").notNull(),
    ppobTransResponReqnum: varchar("ppob_trans_respon_reqnum", { length: 255 }).notNull(),
    ppobTransResponSn: text("ppob_trans_respon_sn").notNull(),
    ppobTransResponDate: timestamp("ppob_trans_respon_date", { withTimezone: true }),
    ppobTransUpdateReason: text("ppob_trans_update_reason").notNull(),
    ppobTransUpdateBy: bigint("ppob_trans_update_by", { mode: "number" }).notNull(),
    ppobTransUpdateDate: timestamp("ppob_trans_update_date", { withTimezone: true }),
    ppobTransFile: text("ppob_trans_file").notNull(),
    ppobTransStruk: text("ppob_trans_struk").notNull(),
    ppobTransInquiry: text("ppob_trans_inquiry"),
    ppobTransParams: text("ppob_trans_params"),
    ppobTransCreateDate: timestamp("ppob_trans_create_date", { withTimezone: true }).notNull(),
    ppobTransCreateDateOnly: date("ppob_trans_create_date_only").generatedAlwaysAs(
      sql`(ppob_trans_create_date AT TIME ZONE 'UTC'::text)::date`,
    ),
    ppobTransCreateYearOnly: varchar("ppob_trans_create_year_only", {
      length: 10,
    }).generatedAlwaysAs(sql`EXTRACT(year FROM (ppob_trans_create_date AT TIME ZONE 'UTC'::text))`),
    ppobTransCreateMonthOnly: varchar("ppob_trans_create_month_only", {
      length: 10,
    }).generatedAlwaysAs(
      sql`EXTRACT(month FROM (ppob_trans_create_date AT TIMEZONEE 'UTC'::text))`
        .toString()
        .replace("TZONEE", "ZONE"),
    ),
  },
  (t) => ({
    customerIdIdx: index("_ppob_trans_inbox_customer_id").on(t.customerId),
    dealerIdIdx: index("_ppob_trans_inbox_dealer_id").on(t.dealerId),
    idpelIdx: index("_ppob_trans_inbox_idpel").on(t.ppobTransIdpel1),
    masterIdIdx: index("_ppob_trans_inbox_master_id").on(t.masterId),
    ppobIdIdx: index("_ppob_trans_inbox_ppob_id").on(t.ppobId),
    ppobReqSendIdx: index("_ppob_trans_inbox_ppob_request_send").on(t.ppobRequestSend),
    createDateIdx: index("_ppob_trans_inbox_ppob_trans_create_date").on(
      t.ppobTransCreateDate.desc(),
    ),
    createDateOnlyIdx: index("_ppob_trans_inbox_ppob_trans_create_date_only").on(
      t.ppobTransCreateDateOnly.desc(),
    ),
    createMonthOnlyIdx: index("_ppob_trans_inbox_ppob_trans_create_month_only").on(
      t.ppobTransCreateMonthOnly.desc(),
    ),
    createYearOnlyIdx: index("_ppob_trans_inbox_ppob_trans_create_year_only").on(
      t.ppobTransCreateYearOnly.desc(),
    ),
    reqnumIdx: index("_ppob_trans_inbox_ppob_trans_respon_reqnum").on(t.ppobTransResponReqnum),
    statusIdx: index("_ppob_trans_inbox_ppob_trans_status").on(t.ppobTransStatus),
    trxIdIdx: index("_ppob_trans_inbox_trx_id").on(t.ppobTransTrxId),
    updateByIdx: index("_ppob_trans_inbox_update_by").on(t.ppobTransUpdateBy),
    priceIdx: index("_ppob_trans_inbox_price").on(
      t.ppobTransPrice,
      t.ppobTransAdminBank,
      t.ppobTransMargin,
      t.ppobTransMarginCompany,
      t.ppobTransMarginMaster,
      t.ppobTransMarginDealer,
      t.ppobTransMarkupCompany,
      t.ppobTransMarkupMaster,
      t.ppobTransMarkupDealer,
      t.ppobTransCashback,
      t.ppobTransCashbackCompany,
      t.ppobTransCashbackMaster,
      t.ppobTransCashbackDealer,
      t.ppobTransCashbackTrans,
    ),
    pvIdIdx: index("_ppob_trans_inbox_pv_id").on(t.pvId),
    statusComboIdx: index("_ppob_trans_inbox_status_combo").on(
      t.ppobTransStatus,
      t.ppobRequestSend,
    ),
    whitelabelIdIdx: index("_ppob_trans_inbox_whitelabel_id").on(t.whitelabelId),
  }),
);

export type PpobTransInbox = typeof ppobTransInboxTable.$inferSelect;
export type NewPpobTransInbox = typeof ppobTransInboxTable.$inferInsert;
