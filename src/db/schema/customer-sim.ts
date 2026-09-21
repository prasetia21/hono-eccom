import { bigint, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { enumCSimStatus, enumZeroOne } from "@/db/schema/enums";

export const customerSimTable = pgTable(
  "_customer_sim",
  {
    cSimId: bigint("c_sim_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }),
    cSimFcmtoken: text("c_sim_fcmtoken"),
    cSimImei: varchar("c_sim_imei", { length: 50 }),
    cSimSn: varchar("c_sim_sn", { length: 50 }),
    cSimMcc: varchar("c_sim_mcc", { length: 10 }),
    cSimMnc: varchar("c_sim_mnc", { length: 10 }),
    cSimPrimary: enumZeroOne("c_sim_primary").default("0"),
    cSimStatus: enumCSimStatus("c_sim_status").default("active"),
    cSimLoginDate: timestamp("c_sim_login_date", { withTimezone: true }),
    cSimCreateDate: timestamp("c_sim_create_date", { withTimezone: true }),
  },
  (table) => ({
    imeiIdx: index("_customer_sim_c_sim_imei").on(table.cSimImei),
    primaryIdx: index("_customer_sim_c_sim_primary").on(table.cSimPrimary),
    simStatusIdx: index("_customer_sim_c_sim_status").on(table.cSimStatus),
    customerIdIdx: index("_customer_sim_customer_id").on(table.customerId),
    statusIdx: index("_customer_sim_status").on(table.cSimPrimary, table.cSimStatus),
    textIdx: index("_customer_sim_text").on(
      table.cSimImei,
      table.cSimSn,
      table.cSimMcc,
      table.cSimMnc,
    ),
  }),
);

export type CustomerSim = typeof customerSimTable.$inferSelect;
export type NewCustomerSim = typeof customerSimTable.$inferInsert;
