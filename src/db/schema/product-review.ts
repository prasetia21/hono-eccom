import { pgTable, bigint, varchar, text, timestamp, numeric, index } from "drizzle-orm/pg-core";

export const productReviewTable = pgTable(
  "_product_review",
  {
    reviewId: bigint("review_id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    customerId: bigint("customer_id", { mode: "number" }),
    productId: bigint("product_id", { mode: "number" }),
    reviewTitle: varchar("review_title", { length: 100 }),
    reviewDesc: text("review_desc"),
    rating: numeric("rating"),
    reviewCreateDate: timestamp("review_create_date", { withTimezone: true }),
    reviewImage: text("review_image"),
  },
  (t) => ({
    idIdx: index("_product_review_id").on(t.customerId, t.productId),
    ratingIdx: index("_product_review_rating").on(t.rating),
  }),
);

export type ProductReview = typeof productReviewTable.$inferSelect;
export type NewProductReview = typeof productReviewTable.$inferInsert;
