import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/libs/postgresql";
import {
  productReviewTable,
  type NewProductReview,
  type ProductReview,
} from "@/db/schema/product-review";
import {
  productReviewReportTable,
  type NewProductReviewReport,
  type ProductReviewReport,
} from "@/db/schema/product-review-report";
import { customerTable } from "@/db/schema/customer";

export interface GetProductReviewsParams {
  productId: number;
  rating?: number;
  page: number;
  limit: number;
}

export interface ReviewWithCustomerRow {
  reviewId: number;
  customerId: number | null;
  productId: number | null;
  reviewTitle: string | null;
  reviewDesc: string | null;
  rating: string | null;
  reviewCreateDate: Date | null;
  reviewImage: string | null;
  customer: {
    customerId: number | null;
    customerName: string | null;
    customerImage: string | null;
  } | null;
}

export class ProductReviewRepository {
  async createReview(data: NewProductReview): Promise<ProductReview | null> {
    const [row] = await db.insert(productReviewTable).values(data).returning();

    return row ?? null;
  }

  async getProductReviews(
    params: GetProductReviewsParams,
  ): Promise<{ data: ReviewWithCustomerRow[]; total: number }> {
    const { productId, rating, page, limit } = params;

    const conditions = [eq(productReviewTable.productId, productId)];

    if (rating !== undefined) {
      conditions.push(eq(productReviewTable.rating, String(rating)));
    }

    const rows = await db
      .select({
        reviewId: productReviewTable.reviewId,
        customerId: productReviewTable.customerId,
        productId: productReviewTable.productId,
        reviewTitle: productReviewTable.reviewTitle,
        reviewDesc: productReviewTable.reviewDesc,
        rating: productReviewTable.rating,
        reviewCreateDate: productReviewTable.reviewCreateDate,
        reviewImage: productReviewTable.reviewImage,
        customer: {
          customerId: customerTable.customerId,
          customerName: customerTable.customerName,
          customerImage: customerTable.customerImage,
        },
      })
      .from(productReviewTable)
      .leftJoin(customerTable, eq(productReviewTable.customerId, customerTable.customerId))
      .where(and(...conditions))
      .orderBy(asc(productReviewTable.reviewCreateDate))
      .limit(limit)
      .offset((page - 1) * limit);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(productReviewTable)
      .where(and(...conditions));

    const data: ReviewWithCustomerRow[] = rows.map((row) => ({
      ...row,
      customer: row.customer && row.customer.customerId !== null ? { ...row.customer } : null,
    }));

    return { data, total: countRow?.count ?? 0 };
  }

  async createReviewReport(data: NewProductReviewReport): Promise<ProductReviewReport | null> {
    const [row] = await db.insert(productReviewReportTable).values(data).returning();

    return row ?? null;
  }
}
