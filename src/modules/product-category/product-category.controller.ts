import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { ProductCategoryService } from "./product-category.service";
import type { ProductCategoryByIdRequest } from "./product-category.dto";

export class ProductCategoryController {
  private service: ProductCategoryService;

  constructor() {
    this.service = new ProductCategoryService();
  }

  categoryById = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as ProductCategoryByIdRequest;

    const result = await this.service.categoryById(payload);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  categoryRecommend = async (c: Context<ContentType>): Promise<Response> => {
    const result = await this.service.categoryRecommend();

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
