import { eq, desc } from "drizzle-orm";
import { db } from "@/libs/postgresql";
import { productCategoryTable, productTable, merchantTable } from "@/db/schema";
import { productCategoryRecommendationTable } from "@/db/schema/product-category-recommendation";

export class ProductCategoryRepository {
  async getCategoryById(catId: number) {
    const category = await db
      .select()
      .from(productCategoryTable)
      .where(eq(productCategoryTable.catId, catId))
      .limit(1);

    return category[0] ?? null;
  }

  async getCategoryRecommendations() {
    // Fetch all active recommendations with their category
    const recommendations = await db
      .select({
        pcRecommendId: productCategoryRecommendationTable.pcRecommendId,
        catId: productCategoryRecommendationTable.catId,
        pcOrderKey: productCategoryRecommendationTable.pcOrderKey,
        pcRecommendImage: productCategoryRecommendationTable.pcRecommendImage,
        pcRecommendStatus: productCategoryRecommendationTable.pcRecommendStatus,
        pcRecommendCreateDate: productCategoryRecommendationTable.pcRecommendCreateDate,
        pcRecommendUpdateDate: productCategoryRecommendationTable.pcRecommendUpdateDate,
        // Category fields
        catName: productCategoryTable.catName,
        catAlias: productCategoryTable.catAlias,
        catDesc: productCategoryTable.catDesc,
        catImage: productCategoryTable.catImage,
        catHits: productCategoryTable.catHits,
        catParent: productCategoryTable.catParent,
        catLevel: productCategoryTable.catLevel,
        catStatus: productCategoryTable.catStatus,
        catRoot: productCategoryTable.catRoot,
        catOrder: productCategoryTable.catOrder,
        isOptionRequired: productCategoryTable.isOptionRequired,
        catShipmentMargin: productCategoryTable.catShipmentMargin,
        catPickupMargin: productCategoryTable.catPickupMargin,
        catFavorite: productCategoryTable.catFavorite,
        catPlatform: productCategoryTable.catPlatform,
      })
      .from(productCategoryRecommendationTable)
      .innerJoin(
        productCategoryTable,
        eq(productCategoryRecommendationTable.catId, productCategoryTable.catId),
      )
      .where(eq(productCategoryRecommendationTable.pcRecommendStatus, "1"))
      .orderBy(desc(productCategoryRecommendationTable.pcRecommendCreateDate));

    if (recommendations.length === 0) return [];

    // Fetch products per category (only those with active merchant)
    const catIds = [...new Set(recommendations.map((r) => r.catId))];

    const products = await db
      .select({
        productId: productTable.productId,
        merchantId: productTable.merchantId,
        catId: productTable.catId,
        productName: productTable.productName,
        productAlias: productTable.productAlias,
        productImage1: productTable.productImage1,
        productPrice: productTable.productPrice,
        productPricePublish: productTable.productPricePublish,
        productStock: productTable.productStock,
        productHits: productTable.productHits,
        productStatus: productTable.productStatus,
        merchantStatus: merchantTable.merchantStatus,
      })
      .from(productTable)
      .innerJoin(merchantTable, eq(productTable.merchantId, merchantTable.merchantId))
      .where(eq(merchantTable.merchantStatus, "1"));

    // Group products by catId
    const productsByCat = new Map<number, typeof products>();
    for (const product of products) {
      if (!catIds.includes(product.catId!)) continue;
      const existing = productsByCat.get(product.catId!) ?? [];
      existing.push(product);
      productsByCat.set(product.catId!, existing);
    }

    return recommendations.map((rec) => ({
      pc_recommend_id: rec.pcRecommendId,
      cat_id: rec.catId,
      pc_order_key: rec.pcOrderKey,
      pc_recommend_image: rec.pcRecommendImage,
      pc_recommend_status: rec.pcRecommendStatus,
      pc_recommend_create_date: rec.pcRecommendCreateDate,
      pc_recommend_update_date: rec.pcRecommendUpdateDate,
      category: {
        cat_id: rec.catId,
        cat_name: rec.catName,
        cat_alias: rec.catAlias,
        cat_desc: rec.catDesc,
        cat_image: rec.catImage,
        cat_hits: rec.catHits,
        cat_parent: rec.catParent,
        cat_level: rec.catLevel,
        cat_status: rec.catStatus,
        cat_root: rec.catRoot,
        cat_order: rec.catOrder,
        is_option_required: rec.isOptionRequired,
        cat_shipment_margin: rec.catShipmentMargin,
        cat_pickup_margin: rec.catPickupMargin,
        cat_favorite: rec.catFavorite,
        cat_platform: rec.catPlatform,
        product: (productsByCat.get(rec.catId) ?? []).map((p) => ({
          product_id: p.productId,
          merchant_id: p.merchantId,
          cat_id: p.catId,
          product_name: p.productName,
          product_alias: p.productAlias,
          product_image_1: p.productImage1,
          product_price: p.productPrice,
          product_price_publish: p.productPricePublish,
          product_stock: p.productStock,
          product_hits: p.productHits,
          product_status: p.productStatus,
        })),
      },
    }));
  }
}
