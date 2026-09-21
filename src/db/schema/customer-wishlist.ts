import { pgTable, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { enumZeroOne } from "./enums";

export const customerWishlistTable = pgTable(
  "_customer_wishlist",
  {
    cwId: bigint("cw_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }),
    productId: bigint("product_id", { mode: "number" }),
    cwStatus: enumZeroOne("cw_status").default("1"),
    cwCreateDate: timestamp("cw_create_date", { withTimezone: true }),
  },
  (t) => ({
    customerIdIdx: index("_customer_wishlist_customer_id").on(t.customerId),
    createDateIdx: index("_customer_wishlist_cw_create_date").on(t.cwCreateDate.desc()),
    productIdIdx: index("_customer_wishlist_product_id").on(t.productId),
    statusIdx: index("_customer_wishlist_status").on(t.cwStatus),
  }),
);

export type CustomerWishlist = typeof customerWishlistTable.$inferSelect;
export type NewCustomerWishlist = typeof customerWishlistTable.$inferInsert;
