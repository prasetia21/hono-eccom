import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { ProductReviewService } from "./product-review.service";
import type {
  AddReviewRequest,
  GetProductReviewRequest,
  ReportReviewRequest,
} from "./product-review.dto";

export class ProductReviewController {
  private service: ProductReviewService;

  constructor() {
    this.service = new ProductReviewService();
  }

  addReview = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as AddReviewRequest;

    const authData = c.get("authData");
    const customerId = Number(authData?.customer_id ?? payload.customer_id ?? 0) || 0;

    const result = await this.service.addReview(payload, customerId);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  getProductReview = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as GetProductReviewRequest;

    const result = await this.service.getProductReview(payload, c.req.url);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  reportReview = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as ReportReviewRequest;

    const authData = c.get("authData");
    const customerId = Number(authData?.customer_id ?? payload.customer_id ?? 0) || 0;

    const result = await this.service.reportReview(payload, customerId);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
