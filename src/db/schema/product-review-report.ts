import { pgTable, bigint, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const productReviewReportTable = pgTable(
  "_product_review_report",
  {
    rReportId: bigint("r_report_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    reviewId: bigint("review_id", { mode: "number" }),
    customerId: bigint("customer_id", { mode: "number" }),
    rReportReason: varchar("r_report_reason", { length: 255 }),
    rReportCreateDate: timestamp("r_report_create_date", { withTimezone: true }),
  },
  (t) => ({
    idIdx: index("_product_review_report_id").on(t.reviewId, t.customerId),
  }),
);

export type ProductReviewReport = typeof productReviewReportTable.$inferSelect;
export type NewProductReviewReport = typeof productReviewReportTable.$inferInsert;
