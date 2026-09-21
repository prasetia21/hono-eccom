import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { ProductService } from "./product.service";
import type { ProductByCategoryRequest, ProductCatMostViewRequest } from "./product.dto";

export class ProductController {
  private service: ProductService;

  constructor() {
    this.service = new ProductService();
  }

  productByCategory = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as ProductByCategoryRequest;

    const result = await this.service.productByCategory(payload, c.req.url);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  categoryRecommend = async (c: Context<ContentType>): Promise<Response> => {
    const result = await this.service.categoryRecommend();

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  productCatMostView = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as ProductCatMostViewRequest;

    const result = await this.service.productCatMostView(payload, c.req.url);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
