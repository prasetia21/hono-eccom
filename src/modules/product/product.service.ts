import { ProductRepository } from "./product.repository";
import { createPaginatedResponse } from "@/shared/utils/pagination";
import { toSnakeCase } from "@/shared/utils/case-transform";
import type {
  ProductByCategoryRequest,
  ProductByCategoryServiceResult,
  ProductItem,
  CategoryRecommendServiceResult,
  ProductCatMostViewRequest,
  ProductCatMostViewServiceResult,
} from "./product.dto";
import { HTTP_STATUS } from "@/shared/constants/http-status.ts";
import { diskon, hargaDiskon } from "@/shared/utils/discount.ts";

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  async productByCategory(
    payload: ProductByCategoryRequest,
    fullUrl: string,
  ): Promise<ProductByCategoryServiceResult> {
    const {
      cat_id,
      harga1 = "",
      harga2 = "",
      condition = "",
      orderBy = "",
      latitude = "",
      longitude = "",
      customer_id = "0",
      page = 1,
      limit = 10,
    } = payload;

    if (orderBy === "terdekat" && (!latitude || !longitude)) {
      return {
        success: false,
        message: "latitude longitude harap diisi",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    const {
      data: products,
      total,
      page: currentPage,
      limit: perPage,
    } = await this.repository.getProductsByCategory({
      catId: cat_id || "",
      harga1,
      harga2,
      condition,
      orderBy,
      latitude,
      longitude,
      customerId: customer_id,
      page,
      limit,
    });

    const customerAddress = await this.repository.getPrimaryCustomerAddress(customer_id || "0");

    const merchantIds = [...new Set(products.map((p: any) => p.merchantId))];

    const merchantMap = new Map();
    for (const mid of merchantIds) {
      const merchant = await this.repository.getMerchantWithCity(mid);
      if (merchant) {
        merchantMap.set(mid, merchant);
      }
    }

    const productIds = products.map((p: any) => p.productId);

    const ratings = await this.repository.getProductRatings(productIds);

    const orderCounts = await this.repository.getOrderCounts(productIds);

    const catIds = [...new Set(products.map((p: any) => p.catId))].filter(Boolean) as number[];
    const attributesMap = await this.repository.getAttributesByCategories(catIds);

    const ongoingFsMap = await this.repository.getOngoingFlashSales(productIds);

    const transformedData = await Promise.all(
      products.map(async (product: any) => {
        const merchantData = merchantMap.get(product.merchantId);
        const merchantDetail = merchantData?.merchant || {};

        const categoryData = product.category;
        const categoryAttributes = attributesMap.get(product.catId) || [];

        const fsDetailData = ongoingFsMap.get(product.productId) || null;

        let courier = false;
        let cod = false;
        const codMerchant = merchantDetail.merchantCod === "1";
        const courierLogout = codMerchant;

        const merchantCityId = merchantDetail.rCityId;
        const customerCityId = customerAddress?.rCityId;

        if (customerCityId && merchantCityId) {
          const codPrices = await this.repository.getDeliveryPrices(merchantCityId, customerCityId);

          courier = codPrices.length > 0;
          cod = codPrices.length > 0 && codMerchant;
        } else {
          courier = true;
          cod = codMerchant;
        }

        const productRating = ratings.get(product.productId) || 0;

        const countOrder = orderCounts.get(product.productId) || 0;

        const persenDiscount = diskon(product.productPrice, product.productPricePublish);

        const hargaDiscount = hargaDiskon(product.productPrice, product.productPricePublish);

        const transformed: ProductItem = {
          product_id: product.productId,
          merchant_id: product.merchantId,
          cat_id: product.catId,
          product_name: product.productName,
          product_alias: product.productAlias || "",
          product_sortdesc: product.productSortdesc || "",
          product_shortdesc_meta: product.productShortdescMeta || "",
          product_desc: product.productDesc || "",
          product_weight: product.productWeight?.toString() || "",
          product_length: product.productLength?.toString() || "",
          product_width: product.productWidth?.toString() || "",
          product_height: product.productHeight?.toString() || "",
          product_diameter: product.productDiameter?.toString() || "",
          product_stock: product.productStock || 0,
          product_hpp: product.productHpp || 0,
          product_discount: product.productDiscount || 0,
          product_price: product.productPrice || 0,
          product_price_publish: product.productPricePublish || 0,
          product_grosir: product.productGrosir || "0",
          product_min_grosir: product.productMinGrosir || 0,
          product_price_grosir: product.productPriceGrosir || 0,
          product_packaging_price: product.productPackagingPrice || 0,
          product_margin: product.productMargin || 0,
          product_shipment_margin: product.productShipmentMargin || 0,
          product_pickup_margin: product.productPickupMargin || 0,
          product_is_insurance: product.productIsInsurance || "0",
          product_image_1: product.productImage1 || null,
          product_image_2: product.productImage2 || null,
          product_image_3: product.productImage3 || null,
          product_image_4: product.productImage4 || null,
          product_image_5: product.productImage5 || null,
          product_hits: product.productHits || 0,
          product_tags: product.productTags || "",
          product_condition: product.productCondition || "baru",
          product_rekomendasi: product.productRekomendasi || "0",
          product_status: product.productStatus || "new",
          reason_block_product: product.reasonBlockProduct || null,
          product_update_date: product.productUpdateDate || "",
          product_create_date: product.productCreateDate || "",
          product_grade: product.productGrade || null,
          product_minus: product.productMinus || "",
          product_rating: Math.min(productRating, 5),
          count_order: countOrder,
          is_cod: cod,
          is_cod_logout: codMerchant,
          is_courier: courier,
          is_courier_logout: courierLogout,
          persen_diskon: persenDiscount,
          harga_diskon: hargaDiscount,
          distance: product.distance || null,
          p_point_total: product.pPointTotal || 0,
          merchant: {
            ...merchantDetail,
            city: merchantData.city,
          },
          category: {
            ...categoryData,
            atribut: categoryAttributes,
          },
          ongoing_fs_detail: fsDetailData,
        };

        return transformed;
      }),
    );

    const paginatedData = createPaginatedResponse(
      transformedData,
      total,
      currentPage,
      perPage,
      fullUrl,
    );

    const snakeCaseData = toSnakeCase(paginatedData);

    return {
      success: true,
      message: "Data Ditemukan!",
      data: snakeCaseData,
      statusCode: HTTP_STATUS.OK,
    };
  }

  async categoryRecommend(): Promise<CategoryRecommendServiceResult> {
    const data = await this.repository.getCategoryRecommendations();

    return {
      success: true,
      message: "Data ditemukan",
      data,
      statusCode: HTTP_STATUS.OK,
    };
  }

  async productCatMostView(
    payload: ProductCatMostViewRequest,
    fullUrl: string,
  ): Promise<ProductCatMostViewServiceResult> {
    const {
      cat_alias,
      harga1 = "",
      harga2 = "",
      condition = "",
      orderBy = "",
      keySearch = "",
      customer_id = "0",
      page = 1,
      limit = 10,
    } = payload;

    // Strip koma dari harga agar kompatibel dengan format "1,000,000" — identik dengan str_replace(',','') di Laravel
    const cleanHarga1 = harga1.replace(/,/g, "");
    const cleanHarga2 = harga2.replace(/,/g, "");

    // Ambil data category berdasarkan alias
    const cat = await this.repository.getCategoryByAlias(cat_alias);

    const {
      data: products,
      total,
      page: currentPage,
      limit: perPage,
    } = await this.repository.getProductsByCategoryAlias({
      catAlias: cat_alias,
      harga1: cleanHarga1 || undefined,
      harga2: cleanHarga2 || undefined,
      condition: condition || undefined,
      orderBy: orderBy || undefined,
      keySearch: keySearch || undefined,
      page,
      limit,
    });

    const customerAddress = await this.repository.getPrimaryCustomerAddress(customer_id);

    const merchantIds = [...new Set(products.map((p: any) => p.merchantId))];
    const merchantMap = new Map();
    for (const mid of merchantIds) {
      // getMerchantWithCityLimited: hanya select 7 kolom yang dipilih Laravel
      const merchant = await this.repository.getMerchantWithCityLimited(mid);
      if (merchant) merchantMap.set(mid, merchant);
    }

    const productIds = products.map((p: any) => p.productId);
    const ratings = await this.repository.getProductRatings(productIds);
    const orderCounts = await this.repository.getOrderCounts(productIds);
    const ongoingFsMap = await this.repository.getOngoingFlashSales(productIds);

    const transformedData = await Promise.all(
      products.map(async (product: any) => {
        const merchantData = merchantMap.get(product.merchantId);
        const merchantDetail = merchantData?.merchant || {};
        const categoryData = product.category;
        const fsDetailData = ongoingFsMap.get(product.productId) || null;

        let courier = false;
        let cod = false;
        const codMerchant = merchantDetail.merchantCod === "1";
        const courierLogout = codMerchant;
        const merchantCityId = merchantDetail.rCityId;
        const customerCityId = customerAddress?.rCityId;

        if (customerCityId && merchantCityId) {
          const codPrices = await this.repository.getDeliveryPrices(merchantCityId, customerCityId);
          courier = codPrices.length > 0;
          cod = codPrices.length > 0 && codMerchant;
        } else {
          courier = true;
          cod = codMerchant;
        }

        const productRating = ratings.get(product.productId) || 0;
        const countOrder = orderCounts.get(product.productId) || 0;
        const persenDiscount = diskon(product.productPrice, product.productPricePublish);
        const hargaDiscount = hargaDiskon(product.productPrice, product.productPricePublish);

        const transformed: ProductItem = {
          product_id: product.productId,
          merchant_id: product.merchantId,
          cat_id: product.catId,
          product_name: product.productName,
          product_alias: product.productAlias || "",
          product_sortdesc: product.productSortdesc || "",
          product_shortdesc_meta: product.productShortdescMeta || "",
          product_desc: product.productDesc || "",
          product_weight: product.productWeight?.toString() || "",
          product_length: product.productLength?.toString() || "",
          product_width: product.productWidth?.toString() || "",
          product_height: product.productHeight?.toString() || "",
          product_diameter: product.productDiameter?.toString() || "",
          product_stock: product.productStock || 0,
          product_hpp: product.productHpp || 0,
          product_discount: product.productDiscount || 0,
          product_price: product.productPrice || 0,
          product_price_publish: product.productPricePublish || 0,
          product_grosir: product.productGrosir || "0",
          product_min_grosir: product.productMinGrosir || 0,
          product_price_grosir: product.productPriceGrosir || 0,
          product_packaging_price: product.productPackagingPrice || 0,
          product_margin: product.productMargin || 0,
          product_shipment_margin: product.productShipmentMargin || 0,
          product_pickup_margin: product.productPickupMargin || 0,
          product_is_insurance: product.productIsInsurance || "0",
          product_image_1: product.productImage1 || null,
          product_image_2: product.productImage2 || null,
          product_image_3: product.productImage3 || null,
          product_image_4: product.productImage4 || null,
          product_image_5: product.productImage5 || null,
          product_hits: product.productHits || 0,
          product_tags: product.productTags || "",
          product_condition: product.productCondition || "baru",
          product_rekomendasi: product.productRekomendasi || "0",
          product_status: product.productStatus || "new",
          reason_block_product: product.reasonBlockProduct || null,
          product_update_date: product.productUpdateDate || "",
          product_create_date: product.productCreateDate || "",
          product_grade: product.productGrade || null,
          product_minus: product.productMinus || "",
          product_rating: Math.min(productRating, 5),
          count_order: countOrder,
          is_cod: cod,
          is_cod_logout: codMerchant,
          is_courier: courier,
          is_courier_logout: courierLogout,
          persen_diskon: persenDiscount,
          harga_diskon: hargaDiscount,
          distance: product.distance || null,
          // p_point_total DISERTAKAN — Laravel hanya forget p_point_id, p_point_hit, dll. tapi BUKAN p_point_total
          p_point_total: product.pPointTotal || 0,
          merchant: {
            ...merchantDetail,
            city: merchantData?.city,
          },
          // category: hanya cat_id dan cat_alias — identik dengan 'category:cat_id,cat_alias' di Laravel
          category: {
            cat_id: categoryData?.catId ?? product.catId,
            cat_alias: categoryData?.catAlias ?? null,
          },
          ongoing_fs_detail: fsDetailData,
        };

        return transformed;
      }),
    );

    const paginatedData = createPaginatedResponse(
      transformedData,
      total,
      currentPage,
      perPage,
      fullUrl,
    );

    const snakeCaseData = toSnakeCase(paginatedData);

    // Serialisasi cat menjadi snake_case
    const catData = cat
      ? {
          cat_id: cat.catId,
          cat_name: cat.catName,
          cat_alias: cat.catAlias,
          cat_desc: cat.catDesc,
          cat_image: cat.catImage,
          cat_hits: cat.catHits,
          cat_parent: cat.catParent,
          cat_level: cat.catLevel,
          cat_status: cat.catStatus,
          cat_root: cat.catRoot,
          cat_order: cat.catOrder,
          is_option_required: cat.isOptionRequired,
          cat_shipment_margin: cat.catShipmentMargin,
          cat_pickup_margin: cat.catPickupMargin,
          cat_favorite: cat.catFavorite ?? null,
          cat_platform: cat.catPlatform ?? null,
        }
      : null;

    return {
      success: true,
      message: "data ditemukan",
      data: snakeCaseData,
      cat: catData,
      statusCode: HTTP_STATUS.OK,
    };
  }
}
