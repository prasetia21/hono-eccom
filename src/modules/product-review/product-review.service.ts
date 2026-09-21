import { ProductReviewRepository } from "./product-review.repository";
import { ProductPointHelper } from "@/shared/utils/product-point";
import { createPaginatedResponse } from "@/shared/utils/pagination";
import { toSnakeCase } from "@/shared/utils/case-transform";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import type {
  AddReviewRequest,
  AddReviewServiceResult,
  GetProductReviewRequest,
  GetProductReviewServiceResult,
  ProductReviewWithCustomer,
  ReportReviewRequest,
  ReportReviewServiceResult,
} from "./product-review.dto";

export class ProductReviewService {
  private repository: ProductReviewRepository;
  private productPoint: ProductPointHelper;

  constructor() {
    this.repository = new ProductReviewRepository();
    this.productPoint = new ProductPointHelper();
  }

  async addReview(payload: AddReviewRequest, customerId: number): Promise<AddReviewServiceResult> {
    const { product_id, review_title, review_desc, rating } = payload;

    if (product_id && review_title && review_desc && rating) {
      const data = await this.repository.createReview({
        customerId,
        productId: Number(product_id),
        reviewTitle: review_title,
        reviewDesc: review_desc,
        rating: String(rating),
        reviewCreateDate: new Date(),
      });

      if (data) {
        await this.productPoint.productPoint(
          data.productId ?? 0,
          "rating",
          String(Math.trunc(Number(rating))),
        );

        return {
          success: true,
          message: "Berhasil menyimpan review produk",
          data: {
            ...toSnakeCase(data),
            rating: data.rating !== null ? Number(data.rating) : null,
          },
          statusCode: HTTP_STATUS.OK,
        };
      } else {
        return {
          success: false,
          message: "Gagal menyimpan review produk",
          statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        };
      }
    } else {
      return {
        success: false,
        message: "Mohon masukkan data yang dibutuhkan",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }
  }

  async getProductReview(
    payload: GetProductReviewRequest,
    fullUrl: string,
  ): Promise<GetProductReviewServiceResult> {
    const { product_id, rating: review_rating } = payload;

    const page = Math.max(1, payload.page ?? 1);
    const limit = Math.max(1, payload.limit ?? 10);

    if (product_id) {
      const ratingFilter = review_rating && review_rating !== 0 ? review_rating : undefined;

      const { data: productReviews, total } = await this.repository.getProductReviews({
        productId: Number(product_id),
        rating: ratingFilter,
        page,
        limit,
      });

      const data: ProductReviewWithCustomer[] = productReviews.map((row) => ({
        review_id: row.reviewId,
        customer_id: row.customerId,
        product_id: row.productId,
        review_title: row.reviewTitle,
        review_desc: row.reviewDesc,
        rating: row.rating !== null ? Number(row.rating) : null,
        review_create_date: row.reviewCreateDate,
        review_image: row.reviewImage,
        customer:
          row.customer && row.customer.customerId !== null
            ? {
                customer_id: row.customer.customerId,
                customer_name: row.customer.customerName,
                customer_image: row.customer.customerImage,
              }
            : null,
      }));

      if (data.length > 0) {
        const paginatedData = createPaginatedResponse(data, total, page, limit, fullUrl);

        return {
          success: true,
          message: "Review produk berhasil ditemukan",
          data: toSnakeCase(paginatedData),
          statusCode: HTTP_STATUS.OK,
        };
      } else {
        return {
          success: false,
          message: "Review produk tidak ditemukan",
          statusCode: HTTP_STATUS.OK,
        };
      }
    } else {
      return {
        success: false,
        message: "Mohon masukkan data yang dibutuhkan",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }
  }

  async reportReview(
    payload: ReportReviewRequest,
    customerId: number,
  ): Promise<ReportReviewServiceResult> {
    const { review_id, review_reason } = payload;

    if (review_id) {
      const report = await this.repository.createReviewReport({
        customerId,
        reviewId: Number(review_id),
        rReportReason: review_reason ?? null,
        rReportCreateDate: new Date(),
      });

      if (report) {
        return {
          success: true,
          message: "Report review berhasil",
          data: toSnakeCase(report),
          statusCode: HTTP_STATUS.OK,
        };
      } else {
        return {
          success: false,
          message: "Report gagal disimpan",
          statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        };
      }
    } else {
      return {
        success: false,
        message: "Mohon masukkan data yang dibutuhkan",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }
  }
}
