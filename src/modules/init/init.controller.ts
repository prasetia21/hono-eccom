import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { InitService } from "./init.service.ts";
import type { GetChildCategoryRequest } from "./init.dto";

export class CategoryController {
  private service: InitService;

  constructor() {
    this.service = new InitService();
  }

  getChildCategory = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as GetChildCategoryRequest;

    const result = await this.service.getChildCategory(payload.cat_parent || "0");

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
