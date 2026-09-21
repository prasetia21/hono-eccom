import { ProductPointRepository, ProductPointSettingRepository } from "./product-point.repository";

export type ProductPointAlias = "update" | "hit" | "favorite" | "cart" | "buy" | "rating";

export class ProductPointService {
  private readonly repository: ProductPointRepository;
  private readonly settingRepository: ProductPointSettingRepository;

  constructor() {
    this.repository = new ProductPointRepository();
    this.settingRepository = new ProductPointSettingRepository();
  }

  async productPoint(productId: number, alias: ProductPointAlias): Promise<string> {
    const settings = await this.settingRepository.getAll();

    const point = await this.repository.findByProductId(productId);

    if (!point) {
      await this.repository.createPoint(productId, settings.create ?? 0);
    }

    const value = settings[alias] ?? 0;

    await this.repository.addPoint(productId, alias, value);

    return "success";
  }
}
