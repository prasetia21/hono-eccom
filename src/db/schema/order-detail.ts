import { pgTable, bigint, varchar, text, timestamp, index, numeric } from "drizzle-orm/pg-core";
import { enumZeroOne, enumODetailStatus } from "./enums";

export const orderDetailTable = pgTable(
  "_order_detail",
  {
    oDetailId: bigint("o_detail_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    orderId: bigint("order_id", { mode: "number" }),
    productId: bigint("product_id", { mode: "number" }),
    psId: bigint("ps_id", { mode: "number" }),
    fsDetailId: bigint("fs_detail_id", { mode: "number" }).default(0),
    oDetailProductName: varchar("o_detail_product_name", { length: 200 }),
    oDetailProductImage: varchar("o_detail_product_image", { length: 200 }),
    oDetailProductOption: varchar("o_detail_product_option", { length: 50 }),
    oDetailProductGrosir: enumZeroOne("o_detail_product_grosir").default("0"),
    oDetailProductPrice: numeric("o_detail_product_price", { precision: 10, scale: 2 }),
    oDetailProductHpp: numeric("o_detail_product_hpp", { precision: 10, scale: 2 }),
    oDetailProductMargin: numeric("o_detail_product_margin", { precision: 10, scale: 2 }),
    oDetailProductInsurance: numeric("o_detail_product_insurance", { precision: 10, scale: 2 }),
    oDetailProductWeight: bigint("o_detail_product_weight", { mode: "number" }),
    oDetailQty: bigint("o_detail_qty", { mode: "number" }),
    oDetailNote: text("o_detail_note"),
    oDetailSubtotalMargin: numeric("o_detail_subtotal_margin", { precision: 10, scale: 2 }).default(
      "0",
    ),
    oDetailSubtotalHpp: numeric("o_detail_subtotal_hpp", { precision: 10, scale: 2 }).default("0"),
    oDetailSubtotal: numeric("o_detail_subtotal", { precision: 10, scale: 2 }),
    oDetailStatus: enumODetailStatus("o_detail_status").default("ok"),
    oDetailCreateDate: timestamp("o_detail_create_date", { withTimezone: true }),
  },
  (t) => ({
    amountIdx: index("_order_detail_amount").on(
      t.oDetailSubtotalMargin,
      t.oDetailSubtotalHpp,
      t.oDetailSubtotal,
    ),
    idIdx: index("_order_detail_id").on(t.orderId, t.productId, t.psId, t.fsDetailId),
    statusIdx: index("_order_detail_status").on(t.oDetailStatus),
  }),
);

export type OrderDetail = typeof orderDetailTable.$inferSelect;
export type NewOrderDetail = typeof orderDetailTable.$inferInsert;
