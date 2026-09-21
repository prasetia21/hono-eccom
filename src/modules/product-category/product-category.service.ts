import { ProductCategoryRepository } from "./product-category.repository";
import type {
  ProductCategoryByIdRequest,
  ProductCategoryByIdServiceResult,
  ProductCategoryRecommendServiceResult,
} from "./product-category.dto";
import { HTTP_STATUS } from "@/shared/constants/http-status";

export class ProductCategoryService {
  private repository: ProductCategoryRepository;

  constructor() {
    this.repository = new ProductCategoryRepository();
  }

  async categoryById(
    payload: ProductCategoryByIdRequest,
  ): Promise<ProductCategoryByIdServiceResult> {
    const { cat_id } = payload;

    const category = await this.repository.getCategoryById(Number(cat_id));

    if (!category) {
      return {
        success: false,
        message: "Data tidak ditemukan",
        statusCode: HTTP_STATUS.NOT_FOUND,
      };
    }

    return {
      success: true,
      message: "Data ditemukan",
      data: {
        cat_id: category.catId,
        cat_name: category.catName,
        cat_alias: category.catAlias,
        cat_desc: category.catDesc,
        cat_image: category.catImage,
        cat_hits: category.catHits,
        cat_parent: category.catParent,
        cat_level: category.catLevel,
        cat_status: category.catStatus,
        cat_root: category.catRoot,
        cat_order: category.catOrder,
        is_option_required: category.isOptionRequired,
        cat_shipment_margin: category.catShipmentMargin,
        cat_pickup_margin: category.catPickupMargin,
        cat_favorite: category.catFavorite ?? null,
        cat_platform: category.catPlatform ?? null,
      },
      statusCode: HTTP_STATUS.OK,
    };
  }

  async categoryRecommend(): Promise<ProductCategoryRecommendServiceResult> {
    const data = await this.repository.getCategoryRecommendations();

    return {
      success: true,
      message: "Data ditemukan",
      data,
      statusCode: HTTP_STATUS.OK,
    };
  }
}
