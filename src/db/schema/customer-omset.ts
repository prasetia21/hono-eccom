import { pgTable, bigint, varchar, timestamp, index, numeric } from "drizzle-orm/pg-core";

export const customerOmsetTable = pgTable(
  "_customer_omset",
  {
    coId: bigint("co_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    coMasterId: bigint("co_master_id", { mode: "number" }).notNull(),
    coDealerId: bigint("co_dealer_id", { mode: "number" }),
    coAmountTrx: numeric("co_amount_trx", { precision: 10, scale: 2 }).notNull(),
    coQtyTrx: varchar("co_qty_trx", { length: 200 }).notNull(),
    coKomisiCompany: numeric("co_komisi_company", { precision: 10, scale: 2 }),
    coKomisiMaster: numeric("co_komisi_master", { precision: 8, scale: 2 }).notNull(),
    coKomisiDealer: numeric("co_komisi_dealer", { precision: 8, scale: 2 }).notNull(),
    coMarkupCompany: numeric("co_markup_company", { precision: 10, scale: 2 }).default("0"),
    coMarkupMaster: numeric("co_markup_master", { precision: 10, scale: 2 }),
    coMarkupDealer: numeric("co_markup_dealer", { precision: 10, scale: 2 }),
    coBulan: varchar("co_bulan", { length: 2 }),
    coTahun: varchar("co_tahun", { length: 4 }),
    spvId: bigint("spv_id", { mode: "number" }),
    spvPercent: numeric("spv_percent").default("0"),
    spvNominal: numeric("spv_nominal", { precision: 8, scale: 2 }).default("0"),
    coCreateDate: timestamp("co_create_date", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    coDealerIdIdx: index("_customer_omset_co_dealer_id").on(table.coDealerId),
    coMasterIdIdx: index("_customer_omset_co_master_id").on(table.coMasterId),
    customerIdIdx: index("_customer_omset_customer_id").on(table.customerId),
    idIdx: index("_customer_omset_id").on(
      table.customerId,
      table.coMasterId,
      table.coDealerId,
      table.spvId,
    ),
    spvIdIdx: index("_customer_omset_spv_id").on(table.spvId),
    timeIdx: index("_customer_omset_time").on(table.coBulan, table.coTahun),
  }),
);

export type CustomerOmset = typeof customerOmsetTable.$inferSelect;
export type NewCustomerOmset = typeof customerOmsetTable.$inferInsert;
