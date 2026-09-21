import { pgTable, bigint, varchar, timestamp, index, numeric } from "drizzle-orm/pg-core";
import { enumLimitStatus } from "./enums";

export const customerRequestLimitTable = pgTable(
  "_customer_request_limit",
  {
    id: bigint("limit_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }).notNull(),
    limitKey: varchar("limit_key", { length: 255 }),
    limitStatus: enumLimitStatus("limit_status").default("pending"),
    limitSignature: varchar("limit_signature", { length: 255 }),
    limitPrev: numeric("limit_prev", { precision: 10, scale: 2 }),
    limitSaldo: numeric("limit_saldo", { precision: 10, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => ({
    customerIdx: index("_customer_request_limit_customer_id").on(t.customerId),
    limitKeyIdx: index("_customer_request_limit_limit_key").on(t.limitKey),
    statusIdx: index("_customer_request_limit_limit_status").on(t.limitStatus),
    createdAtIdx: index("_customer_request_limit_created_at").on(t.createdAt.desc()),
  }),
);

export type CustomerRequestLimit = typeof customerRequestLimitTable.$inferSelect;
export type NewCustomerRequestLimit = typeof customerRequestLimitTable.$inferInsert;
