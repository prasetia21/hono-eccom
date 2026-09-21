import { InitRepository } from "./init.repository.ts";
import type { GetChildCategoryServiceResult } from "./init.dto";
import { HTTP_STATUS } from "@/shared/constants/http-status.ts";
import { toSnakeCase } from "@/shared/utils/case-transform.ts";

export class InitService {
  private repository: InitRepository;

  constructor() {
    this.repository = new InitRepository();
  }

  async getChildCategory(catParent: string): Promise<GetChildCategoryServiceResult> {
    const categories = await this.repository.getChildCategories(catParent);
    return {
      success: true,
      message: "Data ditemukan",
      data: toSnakeCase(categories),
      statusCode: HTTP_STATUS.OK,
    };
  }
}
