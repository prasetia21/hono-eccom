import type { ProductPoint } from "@/db/schema/product-point";
import {
  ProductPointRepository,
  ProductPointSettingRepository,
} from "@/shared/repositories/product-point.repository.ts";

export type ProductPointAlias = "update" | "hit" | "favorite" | "cart" | "buy" | "rating";

export class ProductPointHelper {
  private pointRepository: ProductPointRepository;
  private settingRepository: ProductPointSettingRepository;

  private settingPromise: Promise<Record<string, number>>;

  constructor() {
    this.pointRepository = new ProductPointRepository();
    this.settingRepository = new ProductPointSettingRepository();
    this.settingPromise = this.settingRepository.getAll();
  }

  private async setting(): Promise<Record<string, number>> {
    return await this.settingPromise;
  }

  async productPoint(
    productId: number | string,
    alias: ProductPointAlias,
    rating: string | number = "",
  ): Promise<string> {
    const id = Number(productId);

    let point = await this.pointRepository.findByProductId(id);

    if (!point) {
      await this.create(id);
      point = await this.pointRepository.findByProductId(id);
    }

    switch (alias) {
      case "update":
        await this.update(point);
        break;
      case "hit":
        await this.hit(point);
        break;
      case "favorite":
        await this.favorite(point);
        break;
      case "cart":
        await this.cart(point);
        break;
      case "buy":
        await this.buy(point);
        break;
      case "rating":
        await this.rating(point, rating);
        break;
      default:
        break;
    }

    return "success";
  }

  async create(productId: number): Promise<void> {
    const setting = await this.setting();

    await this.pointRepository.createPoint(productId, setting["create"] ?? 0);
  }

  async update(point: ProductPoint | null): Promise<void> {
    const setting = await this.setting();
    if (!point?.productId) return;

    await this.pointRepository.addPoint(point.productId, "update", setting["update"] ?? 0);
  }

  async hit(point: ProductPoint | null): Promise<void> {
    const setting = await this.setting();
    if (!point?.productId) return;

    await this.pointRepository.addPoint(point.productId, "hit", setting["hit"] ?? 0);
  }

  async favorite(point: ProductPoint | null): Promise<void> {
    const setting = await this.setting();
    if (!point?.productId) return;

    await this.pointRepository.addPoint(point.productId, "favorite", setting["favorite"] ?? 0);
  }

  async cart(point: ProductPoint | null): Promise<void> {
    const setting = await this.setting();
    if (!point?.productId) return;

    await this.pointRepository.addPoint(point.productId, "cart", setting["cart"] ?? 0);
  }

  async buy(point: ProductPoint | null): Promise<void> {
    const setting = await this.setting();
    if (!point?.productId) return;

    await this.pointRepository.addPoint(point.productId, "buy", setting["buy"] ?? 0);
  }

  async rating(point: ProductPoint | null, rating: string | number): Promise<void> {
    const setting = await this.setting();
    if (!point?.productId) return;

    if (rating !== "" && rating !== 0 && rating !== "0" && rating !== null) {
      await this.pointRepository.addPoint(
        point.productId,
        "rating",
        setting[`rating_${rating}`] ?? 0,
      );
    }
  }
}
