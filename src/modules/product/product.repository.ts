import { eq, sql, and, gte, lte, desc, asc, type SQL, inArray } from "drizzle-orm";
import { db } from "@/libs/postgresql";
import {
  productTable,
  productCategoryTable,
  merchantTable,
  productReviewTable,
  orderDetailTable,
  orderTable,
  rajaongkirCityTable,
  customerAddressTable,
  deliveryPriceTable,
  productPointTable,
  productAttributeTable,
} from "@/db/schema";
import { flashsaleDetailTable } from "@/db/schema/flashsale-detail";
import { flashsaleTable } from "@/db/schema/flashsale";
import { productCategoryRecommendationTable } from "@/db/schema/product-category-recommendation";
import { type ProductPrice, productPriceTable } from "@/db/schema/product-price.ts";

export class ProductRepository {
  private buildProductConditions(params: {
    catId: string;
    harga1?: string;
    harga2?: string;
    condition?: string;
  }): SQL<unknown>[] {
    const conditions: SQL<unknown>[] = [];

    conditions.push(sql`${productCategoryTable.catStatus} = '1'`);
    conditions.push(sql`${productTable.productHpp} <= ${productTable.productPrice}`);
    conditions.push(sql`${productTable.productStock} > 0`);
    conditions.push(eq(productTable.productStatus, "publish"));
    conditions.push(eq(merchantTable.merchantStatus, "1"));
    conditions.push(eq(productCategoryTable.catStatus, "1"));

    if (params.harga1 && params.harga2) {
      conditions.push(gte(productTable.productPrice, parseInt(params.harga1)));
      conditions.push(lte(productTable.productPrice, parseInt(params.harga2)));
    } else if (params.harga1) {
      conditions.push(gte(productTable.productPrice, parseInt(params.harga1)));
    } else if (params.harga2) {
      conditions.push(lte(productTable.productPrice, parseInt(params.harga2)));
    }

    if (params.condition) {
      conditions.push(sql`${productTable.productCondition} = ${params.condition}`);
    }

    if (params.catId) {
      conditions.push(sql`
      ${params.catId}::text = ANY(string_to_array(${productCategoryTable.catRoot}, ','))
    `);
    }

    return conditions;
  }

  private buildOrderBy(orderBy: string | undefined): SQL<unknown>[] {
    switch (orderBy) {
      case "populer":
        return [desc(productTable.productHits)];
      case "termahal":
        return [desc(productTable.productPrice)];
      case "termurah":
        return [asc(productTable.productPrice)];
      case "diskon":
        return [desc(productTable.productDiscount)];
      default:
        return [desc(productPointTable.pPointTotal)];
    }
  }

  private buildDistanceCalculate(latitude: number, longitude: number): SQL<number> {
    return sql<number>`
      6371 * acos(
        cos(radians(${latitude}::float8)) * cos(radians(${customerAddressTable.cAddressLatitude}::float8))
        * cos(radians(${customerAddressTable.cAddressLongitude}::float8) - radians(${longitude}::float8))
        + sin(radians(${latitude}::float8)) * sin(radians(${customerAddressTable.cAddressLatitude}::float8))
      )
    `;
  }

  async getProductsByCategory(params: {
    catId: string;
    harga1?: string;
    harga2?: string;
    condition?: string;
    orderBy?: string;
    latitude?: string;
    longitude?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      catId,
      harga1,
      harga2,
      condition,
      orderBy,
      latitude,
      longitude,
      // customerId,
      page = 1,
      limit = 10,
    } = params;

    const conditions = this.buildProductConditions({ catId, harga1, harga2, condition });

    let lat = 0;
    let lng = 0;

    if (orderBy === "terdekat") {
      if (!latitude || !longitude) {
        throw new Error("latitude longitude harap diisi");
      }
      lat = parseFloat(latitude);
      lng = parseFloat(longitude);
    }

    let query;

    if (orderBy === "terdekat") {
      query = await db
        .select({
          productId: productTable.productId,
          merchantId: productTable.merchantId,
          catId: productTable.catId,
          productName: productTable.productName,
          productAlias: productTable.productAlias,
          productShortdescMeta: productTable.productShortdescMeta,
          productSortdesc: productTable.productSortdesc,
          productDesc: productTable.productDesc,
          productWeight: productTable.productWeight,
          productLength: productTable.productLength,
          productWidth: productTable.productWidth,
          productHeight: productTable.productHeight,
          productDiameter: productTable.productDiameter,
          productStock: productTable.productStock,
          productHpp: productTable.productHpp,
          productDiscount: productTable.productDiscount,
          productPrice: productTable.productPrice,
          productPricePublish: productTable.productPricePublish,
          productGrosir: productTable.productGrosir,
          productMinGrosir: productTable.productMinGrosir,
          productPriceGrosir: productTable.productPriceGrosir,
          productPackagingPrice: productTable.productPackagingPrice,
          productMargin: productTable.productMargin,
          productShipmentMargin: productTable.productShipmentMargin,
          productPickupMargin: productTable.productPickupMargin,
          productIsInsurance: productTable.productIsInsurance,
          productImage1: productTable.productImage1,
          productImage2: productTable.productImage2,
          productImage3: productTable.productImage3,
          productImage4: productTable.productImage4,
          productImage5: productTable.productImage5,
          productHits: productTable.productHits,
          productTags: productTable.productTags,
          productCondition: productTable.productCondition,
          productRekomendasi: productTable.productRekomendasi,
          productStatus: productTable.productStatus,
          reasonBlockProduct: productTable.reasonBlockProduct,
          productUpdateDate: productTable.productUpdateDate,
          productCreateDate: productTable.productCreateDate,
          productGrade: productTable.productGrade,
          productMinus: productTable.productMinus,
          pPointTotal: productPointTable.pPointTotal,
          category: productCategoryTable,
        })
        .from(productTable)
        .innerJoin(productCategoryTable, eq(productTable.catId, productCategoryTable.catId))
        .innerJoin(merchantTable, eq(productTable.merchantId, merchantTable.merchantId))
        .innerJoin(productPointTable, eq(productTable.productId, productPointTable.productId))
        .innerJoin(
          customerAddressTable,
          and(
            eq(merchantTable.customerId, customerAddressTable.customerId),
            eq(customerAddressTable.cAddressPrimaryMerchant, "1"),
          ),
        )
        .where(and(...conditions))
        .orderBy(this.buildDistanceCalculate(lat, lng), desc(productPointTable.pPointTotal))
        .limit(limit)
        .offset((page - 1) * limit);
    } else {
      const orderByClauses = this.buildOrderBy(orderBy);

      query = await db
        .select({
          productId: productTable.productId,
          merchantId: productTable.merchantId,
          catId: productTable.catId,
          productName: productTable.productName,
          productAlias: productTable.productAlias,
          productShortdescMeta: productTable.productShortdescMeta,
          productSortdesc: productTable.productSortdesc,
          productDesc: productTable.productDesc,
          productWeight: productTable.productWeight,
          productLength: productTable.productLength,
          productWidth: productTable.productWidth,
          productHeight: productTable.productHeight,
          productDiameter: productTable.productDiameter,
          productStock: productTable.productStock,
          productHpp: productTable.productHpp,
          productDiscount: productTable.productDiscount,
          productPrice: productTable.productPrice,
          productPricePublish: productTable.productPricePublish,
          productGrosir: productTable.productGrosir,
          productMinGrosir: productTable.productMinGrosir,
          productPriceGrosir: productTable.productPriceGrosir,
          productPackagingPrice: productTable.productPackagingPrice,
          productMargin: productTable.productMargin,
          productShipmentMargin: productTable.productShipmentMargin,
          productPickupMargin: productTable.productPickupMargin,
          productIsInsurance: productTable.productIsInsurance,
          productImage1: productTable.productImage1,
          productImage2: productTable.productImage2,
          productImage3: productTable.productImage3,
          productImage4: productTable.productImage4,
          productImage5: productTable.productImage5,
          productHits: productTable.productHits,
          productTags: productTable.productTags,
          productCondition: productTable.productCondition,
          productRekomendasi: productTable.productRekomendasi,
          productStatus: productTable.productStatus,
          reasonBlockProduct: productTable.reasonBlockProduct,
          productUpdateDate: productTable.productUpdateDate,
          productCreateDate: productTable.productCreateDate,
          productGrade: productTable.productGrade,
          productMinus: productTable.productMinus,
          pPointTotal: productPointTable.pPointTotal,
          category: productCategoryTable,
        })
        .from(productTable)
        .innerJoin(productCategoryTable, eq(productTable.catId, productCategoryTable.catId))
        .innerJoin(merchantTable, eq(productTable.merchantId, merchantTable.merchantId))
        .innerJoin(productPointTable, eq(productTable.productId, productPointTable.productId))
        .innerJoin(
          customerAddressTable,
          and(
            eq(merchantTable.customerId, customerAddressTable.customerId),
            eq(customerAddressTable.cAddressPrimaryMerchant, "1"),
          ),
        )
        .where(and(...conditions))
        .orderBy(...orderByClauses)
        .limit(limit)
        .offset((page - 1) * limit);
    }

    const data = query as Record<string, unknown>[];

    const total = await this.countProducts(conditions);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  private async countProducts(conditions: SQL<unknown>[]): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(productTable)
      .innerJoin(productCategoryTable, eq(productTable.catId, productCategoryTable.catId))
      .innerJoin(merchantTable, eq(productTable.merchantId, merchantTable.merchantId))
      .where(and(...conditions));

    return Number(result[0]?.count || 0);
  }

  async getProductRatings(productIds: number[]): Promise<Map<number, number>> {
    if (productIds.length === 0) return new Map();

    const result = await db
      .select({
        productId: productReviewTable.productId,
        productRating: sql<number>`AVG(${productReviewTable.rating})`.as("avg_rating"),
      })
      .from(productReviewTable)
      .where(inArray(productReviewTable.productId, productIds))
      .groupBy(productReviewTable.productId);

    const ratings = new Map<number, number>();
    result.forEach((row) => {
      const productId = row.productId ?? 0;
      ratings.set(productId, Math.min(row.productRating || 0, 5));
    });

    return ratings;
  }

  async getOrderCounts(productIds: number[]): Promise<Map<number, number>> {
    if (productIds.length === 0) return new Map();

    const result = await db
      .select({
        productId: orderDetailTable.productId,
        countOrder: sql<number>`SUM(${orderDetailTable.oDetailQty})`.as("sum_qty"),
      })
      .from(orderDetailTable)
      .innerJoin(orderTable, eq(orderDetailTable.orderId, orderTable.orderId))
      .where(
        and(inArray(orderDetailTable.productId, productIds), eq(orderTable.orderStatus, "finish")),
      )
      .groupBy(orderDetailTable.productId);

    const counts = new Map<number, number>();
    result.forEach((row) => {
      const productId = row.productId ?? 0;
      counts.set(productId, row.countOrder || 0);
    });

    return counts;
  }

  async getPrimaryCustomerAddress(customerId: string): Promise<{
    customerId: number;
    rCityId: number | null;
  } | null> {
    const result = await db
      .select({
        customerId: customerAddressTable.customerId,
        rCityId: customerAddressTable.rCityId,
      })
      .from(customerAddressTable)
      .where(
        and(
          eq(customerAddressTable.customerId, parseInt(customerId)),
          eq(customerAddressTable.cAddressPrimary, "1"),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  async getMerchantPrimaryAddress(customerId: string): Promise<{
    customerId: number;
    rCityId: number | null;
  } | null> {
    const result = await db
      .select({
        customerId: customerAddressTable.customerId,
        rCityId: customerAddressTable.rCityId,
      })
      .from(customerAddressTable)
      .where(
        and(
          eq(customerAddressTable.customerId, parseInt(customerId)),
          eq(customerAddressTable.cAddressPrimaryMerchant, "1"),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  async getMerchantWithCity(merchantId: number) {
    const result = await db
      .select({
        merchant: merchantTable,
        city: rajaongkirCityTable,
      })
      .from(merchantTable)
      .leftJoin(rajaongkirCityTable, eq(merchantTable.rCityId, rajaongkirCityTable.rCityId))
      .where(eq(merchantTable.merchantId, merchantId))
      .limit(1);

    if (!result[0]) return null;

    return result[0];
  }

  /**
   * Versi terbatas dari getMerchantWithCity — identik dengan:
   * $m->where('merchant_status','1')->with('city')
   *   ->select('merchant_id','merchant_name','merchant_logo','merchant_cod','r_city_id','merchant_city','merchant_status')
   * Filter merchant_status tidak diulang karena sudah difilter di query produk utama (INNER JOIN).
   */
  async getMerchantWithCityLimited(merchantId: number) {
    const result = await db
      .select({
        merchant: {
          merchantId: merchantTable.merchantId,
          merchantName: merchantTable.merchantName,
          merchantLogo: merchantTable.merchantLogo,
          merchantCod: merchantTable.merchantCod,
          rCityId: merchantTable.rCityId,
          merchantCity: merchantTable.merchantCity,
          merchantStatus: merchantTable.merchantStatus,
        },
        city: rajaongkirCityTable,
      })
      .from(merchantTable)
      .leftJoin(rajaongkirCityTable, eq(merchantTable.rCityId, rajaongkirCityTable.rCityId))
      .where(eq(merchantTable.merchantId, merchantId))
      .limit(1);

    if (!result[0]) return null;

    return result[0];
  }

  async getDeliveryPrices(
    fromCityId: number,
    toCityId: number,
  ): Promise<
    {
      d_price_id: number;
      d_price_from: number;
      d_price_to: number;
      d_price_cost: number;
      d_price_status: string;
    }[]
  > {
    const result = await db
      .select({
        dPriceId: deliveryPriceTable.dPriceId,
        dPriceFrom: deliveryPriceTable.dPriceFrom,
        dPriceTo: deliveryPriceTable.dPriceTo,
        dPriceCost: deliveryPriceTable.dPriceCost,
        dPriceStatus: deliveryPriceTable.dPriceStatus,
      })
      .from(deliveryPriceTable)
      .where(
        and(
          eq(deliveryPriceTable.dPriceFrom, fromCityId),
          eq(deliveryPriceTable.dPriceTo, toCityId),
          eq(deliveryPriceTable.dPriceStatus, "active"),
        ),
      );

    return result.map((row) => ({
      d_price_id: row.dPriceId,
      d_price_from: row.dPriceFrom,
      d_price_to: row.dPriceTo,
      d_price_cost: row.dPriceCost,
      d_price_status: row.dPriceStatus,
    }));
  }

  async getAttributesByCategories(catIds: number[]): Promise<Map<number, any[]>> {
    if (catIds.length === 0) return new Map();

    const result = await db
      .select()
      .from(productAttributeTable)
      .where(inArray(productAttributeTable.catId, catIds));

    const attributesMap = new Map<number, any[]>();

    result.forEach((row) => {
      const catId = row.catId ?? 0;
      if (!attributesMap.has(catId)) {
        attributesMap.set(catId, []);
      }
      attributesMap.get(catId)!.push(row);
    });

    return attributesMap;
  }

  async getOngoingFlashSales(productIds: number[]): Promise<Map<number, any>> {
    if (productIds.length === 0) return new Map();

    const now = new Date();

    const result = await db
      .select({
        fsDetail: flashsaleDetailTable,
        flashSale: flashsaleTable,
        countOrder: sql<number>`
          COALESCE(
            SUM(${orderDetailTable.oDetailQty}),
              0
          )
        `.as("count_order"),
      })
      .from(flashsaleDetailTable)
      .innerJoin(flashsaleTable, eq(flashsaleDetailTable.fSaleId, flashsaleTable.fSaleId))
      .leftJoin(orderDetailTable, eq(orderDetailTable.fsDetailId, flashsaleDetailTable.fsDetailId))
      .where(
        and(
          inArray(flashsaleDetailTable.productId, productIds),
          eq(flashsaleTable.fSaleStatus, "active"),
          eq(flashsaleDetailTable.fsDetailStatus, "active"),
          lte(flashsaleTable.fSaleStartDate, now),
          gte(flashsaleTable.fSaleEndDate, now),
        ),
      )
      .groupBy(flashsaleDetailTable.fsDetailId, flashsaleTable.fSaleId);

    const fsMap = new Map<number, any>();

    result.forEach((row) => {
      const pId = row.fsDetail.productId ?? 0;
      fsMap.set(pId, {
        ...row.fsDetail,
        flash_sale: row.flashSale,
        count_order: Number(row.countOrder ?? 0),
      });
    });

    return fsMap;
  }

  async getCategoryRecommendations() {
    // Fetch active recommendations joined with active category
    const recommendations = await db
      .select({
        pcRecommendId: productCategoryRecommendationTable.pcRecommendId,
        catId: productCategoryRecommendationTable.catId,
        pcOrderKey: productCategoryRecommendationTable.pcOrderKey,
        pcRecommendImage: productCategoryRecommendationTable.pcRecommendImage,
        pcRecommendStatus: productCategoryRecommendationTable.pcRecommendStatus,
        pcRecommendCreateDate: productCategoryRecommendationTable.pcRecommendCreateDate,
        pcRecommendUpdateDate: productCategoryRecommendationTable.pcRecommendUpdateDate,
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
      .where(
        and(
          eq(productCategoryRecommendationTable.pcRecommendStatus, "1"),
          eq(productCategoryTable.catStatus, "1"),
        ),
      )
      .orderBy(desc(productCategoryRecommendationTable.pcRecommendCreateDate));

    if (recommendations.length === 0) return [];

    const catIds = [...new Set(recommendations.map((r) => r.catId))];

    // Fetch products with active merchant for the relevant categories
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
      })
      .from(productTable)
      .innerJoin(merchantTable, eq(productTable.merchantId, merchantTable.merchantId))
      .where(
        and(eq(merchantTable.merchantStatus, "1"), inArray(productTable.catId as any, catIds)),
      );

    // Group products by catId
    const productsByCat = new Map<number, typeof products>();
    for (const product of products) {
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

  async getCategoryByAlias(catAlias: string) {
    const result = await db
      .select()
      .from(productCategoryTable)
      .where(eq(productCategoryTable.catAlias, catAlias))
      .limit(1);

    return result[0] ?? null;
  }

  async getProductsByCategoryAlias(params: {
    catAlias: string;
    harga1?: string;
    harga2?: string;
    condition?: string;
    orderBy?: string;
    keySearch?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      catAlias,
      harga1,
      harga2,
      condition,
      orderBy,
      keySearch,
      page = 1,
      limit = 10,
    } = params;

    // Base conditions (same as productByCategory but filtered by cat_alias)
    const conditions: SQL<unknown>[] = [];
    conditions.push(sql`${productCategoryTable.catStatus} = '1'`);
    conditions.push(sql`${productTable.productHpp} <= ${productTable.productPrice}`);
    conditions.push(sql`${productTable.productStock} > 0`);
    conditions.push(eq(productTable.productStatus, "publish"));
    conditions.push(eq(merchantTable.merchantStatus, "1"));
    conditions.push(eq(productCategoryTable.catAlias, catAlias));

    // Harga filter: identik dengan Laravel — jika salah satu harga tidak kosong,
    // KEDUANYA selalu diapply sekaligus (>=harga1 AND <=harga2)
    if (harga1 || harga2) {
      conditions.push(gte(productTable.productPricePublish, parseInt(harga1 || "0")));
      conditions.push(lte(productTable.productPricePublish, parseInt(harga2 || "0")));
    }

    if (condition) {
      conditions.push(eq(productTable.productCondition, condition as "baru" | "bekas"));
    }

    if (keySearch) {
      conditions.push(
        sql`(
          ${productTable.productName} ILIKE ${"%" + keySearch + "%"}
          OR ${productTable.productDesc} ILIKE ${"%" + keySearch + "%"}
          OR ${productTable.productTags} ILIKE ${"%" + keySearch + "%"}
        )`,
      );
    }

    // Build ORDER BY — default is p_point_total DESC
    let orderByClauses: SQL<unknown>[];
    switch (orderBy) {
      case "populer":
        orderByClauses = [desc(productTable.productHits)];
        break;
      case "termahal":
        orderByClauses = [desc(productTable.productPricePublish)];
        break;
      case "termurah":
        orderByClauses = [asc(productTable.productPricePublish)];
        break;
      case "diskon":
        orderByClauses = [desc(productTable.productDiscount)];
        break;
      default:
        orderByClauses = [desc(productPointTable.pPointTotal)];
    }

    const rows = await db
      .select({
        productId: productTable.productId,
        merchantId: productTable.merchantId,
        catId: productTable.catId,
        productName: productTable.productName,
        productAlias: productTable.productAlias,
        productShortdescMeta: productTable.productShortdescMeta,
        productSortdesc: productTable.productSortdesc,
        productDesc: productTable.productDesc,
        productWeight: productTable.productWeight,
        productLength: productTable.productLength,
        productWidth: productTable.productWidth,
        productHeight: productTable.productHeight,
        productDiameter: productTable.productDiameter,
        productStock: productTable.productStock,
        productHpp: productTable.productHpp,
        productDiscount: productTable.productDiscount,
        productPrice: productTable.productPrice,
        productPricePublish: productTable.productPricePublish,
        productGrosir: productTable.productGrosir,
        productMinGrosir: productTable.productMinGrosir,
        productPriceGrosir: productTable.productPriceGrosir,
        productPackagingPrice: productTable.productPackagingPrice,
        productMargin: productTable.productMargin,
        productShipmentMargin: productTable.productShipmentMargin,
        productPickupMargin: productTable.productPickupMargin,
        productIsInsurance: productTable.productIsInsurance,
        productImage1: productTable.productImage1,
        productImage2: productTable.productImage2,
        productImage3: productTable.productImage3,
        productImage4: productTable.productImage4,
        productImage5: productTable.productImage5,
        productHits: productTable.productHits,
        productTags: productTable.productTags,
        productCondition: productTable.productCondition,
        productRekomendasi: productTable.productRekomendasi,
        productStatus: productTable.productStatus,
        reasonBlockProduct: productTable.reasonBlockProduct,
        productUpdateDate: productTable.productUpdateDate,
        productCreateDate: productTable.productCreateDate,
        productGrade: productTable.productGrade,
        productMinus: productTable.productMinus,
        pPointTotal: productPointTable.pPointTotal,
        // category: hanya cat_id dan cat_alias — identik dengan Laravel 'category:cat_id,cat_alias'
        category: {
          catId: productCategoryTable.catId,
          catAlias: productCategoryTable.catAlias,
        },
      })
      .from(productTable)
      .innerJoin(productCategoryTable, eq(productTable.catId, productCategoryTable.catId))
      .innerJoin(merchantTable, eq(productTable.merchantId, merchantTable.merchantId))
      // has('merchant.city') — merchant wajib memiliki data kota
      .innerJoin(rajaongkirCityTable, eq(merchantTable.rCityId, rajaongkirCityTable.rCityId))
      .innerJoin(productPointTable, eq(productTable.productId, productPointTable.productId))
      .where(and(...conditions))
      .orderBy(...orderByClauses)
      .limit(limit)
      .offset((page - 1) * limit);

    // Count total
    const countResult = await db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(productTable)
      .innerJoin(productCategoryTable, eq(productTable.catId, productCategoryTable.catId))
      .innerJoin(merchantTable, eq(productTable.merchantId, merchantTable.merchantId))
      .innerJoin(rajaongkirCityTable, eq(merchantTable.rCityId, rajaongkirCityTable.rCityId))
      .innerJoin(productPointTable, eq(productTable.productId, productPointTable.productId))
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    return {
      data: rows as Record<string, unknown>[],
      total,
      page,
      limit,
    };
  }

  async getProductPrices(productId: number): Promise<ProductPrice[]> {
    return await db
      .select()
      .from(productPriceTable)
      .where(eq(productPriceTable.productId, productId))
      .orderBy(asc(productPriceTable.pPriceQty));
  }

  async getProductForCart(productId: number) {
    const [product] = await db
      .select()
      .from(productTable)
      .where(and(eq(productTable.productId, productId), eq(productTable.productStatus, "publish")))
      .limit(1);

    return product ?? null;
  }
}
