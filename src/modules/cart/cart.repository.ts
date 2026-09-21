import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/libs/postgresql";

import { merchantTable } from "@/db/schema/merchant";
import { cartTable } from "@/db/schema/cart";
import { productTable } from "@/db/schema/product";
import { type ProductStock, productStockTable } from "@/db/schema/product-stock";
import { productPriceTable } from "@/db/schema/product-price";
import { flashsaleDetailTable } from "@/db/schema/flashsale-detail.ts";
import { orderDetailTable } from "@/db/schema/order-detail";
import { rajaongkirCityTable } from "@/db/schema/rajaongkir-city.ts";
import { customerAddressTable } from "@/db/schema/customer-address";
import { deliveryPriceTable } from "@/db/schema/delivery-price";
import { HTTP_STATUS } from "@/shared/constants/http-status.ts";
import type {
  AddCartServiceResult,
  CartDeleteAllServiceResult,
  CartDeleteServiceResult,
  CartSelectedAllServiceResult,
  CartSelectedMerchantServiceResult,
  CartSelectedServiceResult,
  CheckoutNowServiceResult,
  ProductCheckoutV3ServiceResult,
  UpdateCartServiceResult,
} from "@/modules/cart/cart.dto.ts";
import { ProductPointService } from "@/modules/product-point/product-point.service.ts";
import { ProductRepository } from "@/modules/product";
import { calculateProductStock } from "@/shared/helpers/product/calculate-product-stock.ts";
import { calculateProductPrice } from "@/shared/helpers/product/calculate-product-price.ts";
import { flashSaleCheck } from "@/shared/helpers/flash-sale/flash-sale-check.ts";
import { nowInJakarta } from "@/shared/utils/date.ts";
import { flashsaleTable } from "@/db/schema/flashsale.ts";

export interface GetCartV3Params {
  customerId: number;
}

export interface CartAddV3Params {
  customerId: number;
  merchantId: number;
  productId: number;
  qty: number;
  note?: string | null;
  productVariant?: number | null;
}

export interface CheckoutNowParams {
  customerId: number;
  merchantId: number;
  productId: number;
  qty: number;
  note?: string | null;
  productVariant?: number | null;
}

export interface CartQtyV3Params {
  cartId: number;
  qty: number;
}

export class CartRepository {
  private productRepository: ProductRepository;
  private productPointService: ProductPointService;

  private async getOngoingFlashSaleDetail(productId: number) {
    const now = new Date();

    const [result] = await db
      .select({
        detail: flashsaleDetailTable,
        flashSale: flashsaleTable,
      })
      .from(flashsaleDetailTable)
      .innerJoin(flashsaleTable, eq(flashsaleDetailTable.fSaleId, flashsaleTable.fSaleId))
      .where(
        and(
          eq(flashsaleDetailTable.productId, productId),
          eq(flashsaleDetailTable.fsDetailStatus, "active"),
          eq(flashsaleTable.fSaleStatus, "active"),
          sql`${flashsaleTable.fSaleStartDate} <= ${now}`,
          sql`${flashsaleTable.fSaleEndDate} >= ${now}`,
        ),
      )
      .orderBy(desc(flashsaleTable.fSaleStartDate))
      .limit(1);

    return result?.detail ?? null;
  }

  constructor() {
    this.productRepository = new ProductRepository();
    this.productPointService = new ProductPointService();
  }

  async getCartV3(params: GetCartV3Params) {
    const { customerId } = params;

    const cartRows = await db
      .select({
        cart: cartTable,
        product: productTable,
        merchant: merchantTable,
        variant: productStockTable,
      })
      .from(cartTable)
      .innerJoin(
        productTable,
        and(
          eq(cartTable.productId, productTable.productId),
          eq(productTable.productStatus, "publish"),
        ),
      )
      .innerJoin(merchantTable, eq(cartTable.merchantId, merchantTable.merchantId))
      .leftJoin(productStockTable, eq(cartTable.psId, productStockTable.psId))
      .where(eq(cartTable.customerId, customerId))
      .orderBy(desc(cartTable.cartCreate));

    if (cartRows.length === 0) {
      return [];
    }

    const merchantIds = [
      ...new Set(
        cartRows.map((row) => row.merchant.merchantId).filter((id): id is number => id !== null),
      ),
    ];

    const merchants = await db
      .select({
        merchant: merchantTable,
        city: rajaongkirCityTable,
      })
      .from(merchantTable)
      .leftJoin(rajaongkirCityTable, eq(merchantTable.rCityId, rajaongkirCityTable.rCityId))
      .where(inArray(merchantTable.merchantId, merchantIds));

    const productIds = [
      ...new Set(
        cartRows.map((row) => row.product.productId).filter((id): id is number => id !== null),
      ),
    ];

    const productPrices = await db
      .select({
        price: productPriceTable,
      })
      .from(productPriceTable)
      .where(inArray(productPriceTable.productId, productIds))
      .orderBy(desc(productPriceTable.pPriceQty));

    const now = new Date();

    const fsDetails = await db
      .select({
        fsDetail: flashsaleDetailTable,
        flashSale: flashsaleTable,
      })
      .from(flashsaleDetailTable)
      .innerJoin(flashsaleTable, eq(flashsaleDetailTable.fSaleId, flashsaleTable.fSaleId))
      .where(
        and(
          inArray(flashsaleDetailTable.productId, productIds),
          eq(flashsaleDetailTable.fsDetailStatus, "active"),
          eq(flashsaleTable.fSaleStatus, "active"),
          sql`${flashsaleTable.fSaleStartDate} <= ${now}`,
          sql`${flashsaleTable.fSaleEndDate} >= ${now}`,
        ),
      )
      .orderBy(desc(flashsaleTable.fSaleStartDate));

    const fsDetailIds = fsDetails
      .map((row) => row.fsDetail.fsDetailId)
      .filter((id): id is number => id !== null);

    const orderCounts =
      fsDetailIds.length > 0
        ? await db
            .select({
              fsDetailId: orderDetailTable.fsDetailId,
              countOrder: sql<number>`
                COALESCE(SUM(${orderDetailTable.oDetailQty}), 0)
              `.mapWith(Number),
            })
            .from(orderDetailTable)
            .where(inArray(orderDetailTable.fsDetailId, fsDetailIds))
            .groupBy(orderDetailTable.fsDetailId)
        : [];

    const [customerAddress] = await db
      .select({
        customerId: customerAddressTable.customerId,
        cityId: customerAddressTable.rCityId,
      })
      .from(customerAddressTable)
      .where(
        and(
          eq(customerAddressTable.customerId, customerId),
          eq(customerAddressTable.cAddressPrimary, "1"),
        ),
      )
      .limit(1);

    const merchantMap = new Map(
      merchants.map((row) => [
        row.merchant.merchantId,
        {
          ...row.merchant,
          city: row.city,
        },
      ]),
    );

    const productPriceMap = new Map<number, typeof productPrices>();

    for (const row of productPrices) {
      const productId = row.price.productId;

      if (productId === null) {
        continue;
      }

      const existing = productPriceMap.get(productId) ?? [];

      existing.push(row);

      productPriceMap.set(productId, existing);
    }

    const fsDetailMap = new Map<number, (typeof fsDetails)[number]>();

    for (const row of fsDetails) {
      const productId = row.fsDetail.productId;

      if (productId === null) {
        continue;
      }

      if (!fsDetailMap.has(productId)) {
        fsDetailMap.set(productId, row);
      }
    }

    const orderCountMap = new Map(orderCounts.map((row) => [row.fsDetailId, row.countOrder]));

    const merchantMapResult = new Map<number, any>();

    for (const row of cartRows) {
      const merchantId = row.merchant.merchantId;

      if (merchantId === null) {
        continue;
      }

      if (!merchantMapResult.has(merchantId)) {
        const merchant = merchantMap.get(merchantId);

        merchantMapResult.set(merchantId, {
          ...merchant,
          cart: [],
        });
      }

      const merchantData = merchantMapResult.get(merchantId);

      const productId = row.product.productId;

      const fsItem = productId !== null ? fsDetailMap.get(productId) : undefined;

      const ongoingFs = fsItem
        ? {
            ...fsItem.fsDetail,
            order_detail:
              fsItem.fsDetail.fsDetailId !== null
                ? [
                    {
                      fsDetailId: fsItem.fsDetail.fsDetailId,
                      countOrder: orderCountMap.get(fsItem.fsDetail.fsDetailId) ?? 0,
                    },
                  ]
                : [],
          }
        : null;

      const productPrice =
        productId !== null ? (productPriceMap.get(productId) ?? []).map((item) => item.price) : [];

      merchantData.cart.push({
        ...row.cart,

        product: {
          ...row.product,
          ongoing_fs_detail: ongoingFs,
          product_price_grosir: productPrice,
        },

        variant: row.variant,
      });
    }

    const result = await Promise.all(
      Array.from(merchantMapResult.values()).map(async (merchant) => {
        let codMerchant: any = "1";

        if (customerAddress && customerAddress.cityId !== null && merchant.rCityId !== null) {
          const [deliveryPrice] = await db
            .select()
            .from(deliveryPriceTable)
            .where(
              and(
                eq(deliveryPriceTable.dPriceFrom, merchant.rCityId),
                eq(deliveryPriceTable.dPriceTo, customerAddress.cityId),
                eq(deliveryPriceTable.dPriceStatus, "active"),
              ),
            )
            .limit(1);

          codMerchant = deliveryPrice ?? null;
        }

        const merchantCod = merchant.merchantCod;

        return {
          ...merchant,

          is_cod_logout: merchantCod === "1",

          is_cod: !!codMerchant && merchantCod === "1",

          is_courier_logout: merchantCod === "1",

          is_courier: !!codMerchant,
        };
      }),
    );

    result.sort((a, b) => {
      const dateA = a.cart?.[0]?.cartCreate instanceof Date ? a.cart[0].cartCreate.getTime() : 0;

      const dateB = b.cart?.[0]?.cartCreate instanceof Date ? b.cart[0].cartCreate.getTime() : 0;

      return dateB - dateA;
    });

    return result;
  }

  async addCartV3(params: CartAddV3Params): Promise<AddCartServiceResult> {
    const { customerId, merchantId, productId, qty, note, productVariant } = params;

    if (qty < 0) {
      return {
        success: false,
        failed: "empty_stock",
        message: "Kuantitas pembelian tidak boleh kurang dari 0",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    const safeVariantId =
      productVariant === undefined || productVariant === null || productVariant === 0
        ? null
        : productVariant;

    const product = await this.productRepository.getProductForCart(productId);

    if (!product) {
      return {
        success: false,
        failed: "product_unavailable",
        message: "Produk tidak tersedia!",
        statusCode: HTTP_STATUS.NOT_FOUND,
      };
    }

    if (product.merchantId === merchantId) {
      return {
        success: false,
        failed: "merchant_unavailable",
        message: "Tidak dapat membeli produk di toka anda sendiri!",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    const [existingCart] = await db
      .select()
      .from(cartTable)
      .where(
        and(
          eq(cartTable.customerId, customerId),
          eq(cartTable.productId, productId),
          safeVariantId === null
            ? sql`${cartTable.psId} IS NULL`
            : eq(cartTable.psId, safeVariantId),
        ),
      )
      .limit(1);

    const currentQty = existingCart ? Number(existingCart.qty) : 0;

    const newQty = currentQty + qty;

    const flashSales = await this.productRepository.getOngoingFlashSales([productId]);

    const flashSale = flashSales.get(productId) ?? null;

    const grosir = await this.productRepository.getProductPrices(productId);

    const price = calculateProductPrice(product, flashSale, grosir, newQty);

    if (Number(price.product_hpp) > Number(product.productPrice)) {
      return {
        success: false,
        failed: "product_unavailable",
        message: "Produk tidak dapat diproses, silahkan hubungi toko terlebih dahulu!",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    let variant: ProductStock | null = null;

    if (safeVariantId !== null) {
      const [stockVariant] = await db
        .select()
        .from(productStockTable)
        .where(eq(productStockTable.psId, safeVariantId))
        .limit(1);

      variant = stockVariant ?? null;
    }

    const stock = calculateProductStock(product, flashSale, variant);

    if (stock < newQty) {
      return {
        success: false,
        failed: "empty_stock",
        message: "Stok produk tidak mencukupi!",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    if (!product) {
      return {
        success: false,
        failed: "product_unavailable",
        message: "Produk tidak tersedia!",
        statusCode: HTTP_STATUS.NOT_FOUND,
      };
    }

    if (product.merchantId === null) {
      return {
        success: false,
        failed: "product_unavailable",
        message: "Produk tidak memiliki merchant!",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    if (existingCart) {
      await db
        .update(cartTable)
        .set({
          qty: String(newQty),
        })
        .where(eq(cartTable.cartId, existingCart.cartId));
    } else {
      await db.insert(cartTable).values({
        customerId,
        productId,
        merchantId: product.merchantId,
        note: note ?? "",
        psId: safeVariantId,
        qty: String(newQty),
        cartStatus: "on",
        cartCreate: nowInJakarta(),
      });
    }

    const [totalQtyResult] = await db
      .select({
        aggregate: sql<number>`
                COALESCE(
                    SUM(
                        CAST(${cartTable.qty} AS INTEGER)
                    ),
                    0
                )
            `.mapWith(Number),
      })
      .from(cartTable)
      .innerJoin(
        productTable,
        and(
          eq(cartTable.productId, productTable.productId),
          eq(productTable.productStatus, "publish"),
        ),
      )
      .where(and(eq(cartTable.customerId, customerId), eq(cartTable.cartStatus, "on")));

    const totalQty = Number(totalQtyResult?.aggregate ?? 0);

    await this.productPointService.productPoint(product.productId, "cart");

    return {
      success: true,
      message: "Produk berhasil ditambahkan ke Keranjang",
      data: product,
      totalQty,
      statusCode: HTTP_STATUS.OK,
    };
  }

  async checkoutNow(params: CheckoutNowParams): Promise<CheckoutNowServiceResult> {
    const { customerId, merchantId, productId, qty, note, productVariant } = params;

    if (qty < 0) {
      return {
        success: false,
        failed: "empty_stock",
        message: "Kuantitas pembelian tidak boleh kurang dari 0",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    const safeVariantId =
      productVariant === undefined || productVariant === null || productVariant === 0
        ? null
        : productVariant;

    const product = await this.productRepository.getProductForCart(productId);

    if (!product) {
      return {
        success: false,
        failed: "product_unavailable",
        message: "Produk tidak tersedia!",
        statusCode: HTTP_STATUS.NOT_FOUND,
      };
    }

    if (product.merchantId === merchantId) {
      return {
        success: false,
        failed: "merchant_unavailable",
        message: "Tidak dapat membeli produk di toko anda sendiri!",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    const [existingCart] = await db
      .select()
      .from(cartTable)
      .where(
        and(
          eq(cartTable.customerId, customerId),

          eq(cartTable.productId, productId),

          safeVariantId === null
            ? sql`${cartTable.psId} IS NULL`
            : eq(cartTable.psId, safeVariantId),
        ),
      )
      .limit(1);

    const currentQty = existingCart ? Number(existingCart.qty) : 0;

    const newQty = currentQty + qty;

    const flashSales = await this.productRepository.getOngoingFlashSales([productId]);

    const flashSale = flashSales.get(productId) ?? null;

    const grosir = await this.productRepository.getProductPrices(productId);

    const price = calculateProductPrice(product, flashSale, grosir, newQty);

    if (Number(price.product_hpp) > Number(product.productPrice)) {
      return {
        success: false,
        failed: "product_unavailable",
        message: "Produk tidak dapat diproses, silahkan hubungi toko terlebih dahulu!",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    let variant: ProductStock | null = null;

    if (safeVariantId !== null) {
      const [stockVariant] = await db
        .select()
        .from(productStockTable)
        .where(eq(productStockTable.psId, safeVariantId))
        .limit(1);

      variant = stockVariant ?? null;
    }

    const stock = calculateProductStock(product, flashSale, variant);

    if (stock < newQty) {
      return {
        success: false,
        failed: "empty_stock",
        message: "Stock produk tidak mencukupi!",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    if (product.merchantId === null) {
      return {
        success: false,
        failed: "product_unavailable",
        message: "Produk tidak memiliki merchant!",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    if (existingCart) {
      await db
        .update(cartTable)
        .set({
          qty: String(newQty),
        })
        .where(eq(cartTable.cartId, existingCart.cartId));
    } else {
      await db.insert(cartTable).values({
        customerId,
        productId,
        merchantId: product.merchantId,
        note: note ?? "",
        psId: safeVariantId,
        qty: String(newQty),
        cartStatus: "on",
        cartCreate: nowInJakarta(),
      });

      await db
        .update(cartTable)
        .set({
          cartStatus: "off",
        })
        .where(
          and(eq(cartTable.customerId, customerId), sql`${cartTable.productId} != ${productId}`),
        );
    }

    const [totalQtyResult] = await db
      .select({
        aggregate: sql<number>`
                    COALESCE(
                        SUM(
                            CAST(
                                ${cartTable.qty}
                                AS INTEGER
                            )
                        ),
                        0
                    )
                `.mapWith(Number),
      })
      .from(cartTable)
      .innerJoin(
        productTable,
        and(
          eq(cartTable.productId, productTable.productId),
          eq(productTable.productStatus, "publish"),
        ),
      )
      .where(and(eq(cartTable.customerId, customerId), eq(cartTable.cartStatus, "on")));

    const totalQty = Number(totalQtyResult?.aggregate ?? 0);

    await this.productPointService.productPoint(product.productId, "cart");

    return {
      success: true,
      message: "Produk berhasil ditambahkan ke keranjang",
      data: product,
      totalQty,
      statusCode: HTTP_STATUS.OK,
    };
  }

  async cartQtyV3(params: CartQtyV3Params): Promise<UpdateCartServiceResult> {
    const { cartId, qty } = params;

    if (qty < 0) {
      return {
        success: false,
        failed: "empty_stock",
        message: "Stock tidak boleh kurang dari 0",
        statusCode: HTTP_STATUS.BAD_REQUEST,
      };
    }

    const [cart] = await db
      .select({
        cart: cartTable,
        product: productTable,
        variant: productStockTable,
      })
      .from(cartTable)
      .innerJoin(
        productTable,
        and(
          eq(cartTable.productId, productTable.productId),
          eq(productTable.productStatus, "publish"),
        ),
      )
      .leftJoin(productStockTable, eq(cartTable.psId, productStockTable.psId))
      .where(eq(cartTable.cartId, cartId))
      .limit(1);

    if (!cart) {
      return {
        success: false,
        failed: "cart_unavailable",
        message: "Data cart tidak ditemukan!",
        statusCode: HTTP_STATUS.NOT_FOUND,
      };
    }

    let stock: number;

    if (cart.variant) {
      stock = Number(cart.variant.psStock ?? 0);

      if (stock < qty) {
        return {
          success: false,
          failed: "empty_stock",
          message: "Stock tidak mencukupi!",
          statusCode: HTTP_STATUS.BAD_REQUEST,
        };
      }
    } else {
      stock = Number(cart.product.productStock ?? 0);

      if (stock < qty) {
        return {
          success: false,
          failed: "empty_stock",
          message: "Stock produk tidak mencukupi!",
          statusCode: HTTP_STATUS.BAD_REQUEST,
        };
      }
    }

    await db
      .update(cartTable)
      .set({
        qty: String(qty),
      })
      .where(eq(cartTable.cartId, cartId));

    return {
      success: true,
      message: "Data berhasil diperbarui",
      statusCode: HTTP_STATUS.OK,
    };
  }

  async cartDeleteV2(customerId: number, cartId: number): Promise<CartDeleteServiceResult> {
    const result = await db
      .delete(cartTable)
      .where(and(eq(cartTable.customerId, customerId), eq(cartTable.cartId, cartId)))
      .returning({
        cartId: cartTable.cartId,
      });

    if (result.length === 0) {
      return {
        success: false,
        message: "Data tidak ditemukan",
        statusCode: HTTP_STATUS.NOT_FOUND,
      };
    }

    return {
      success: true,
      message: "Data berhasil dihapus",
      statusCode: HTTP_STATUS.OK,
    };
  }

  async cartDeleteAllV2(customerId: number): Promise<CartDeleteAllServiceResult> {
    await db.delete(cartTable).where(eq(cartTable.customerId, customerId));

    return {
      success: true,
      message: "Data berhasil dihapus",
      statusCode: HTTP_STATUS.OK,
    };
  }

  async cartSelectedV2(customerId: number, cartId: number): Promise<CartSelectedServiceResult> {
    const [cart] = await db
      .select({
        cart: cartTable,
        product: productTable,
      })
      .from(cartTable)
      .innerJoin(
        productTable,
        and(
          eq(cartTable.productId, productTable.productId),
          eq(productTable.productStatus, "publish"),
        ),
      )
      .where(and(eq(cartTable.customerId, customerId), eq(cartTable.cartId, cartId)))
      .limit(1);

    if (!cart) {
      return {
        success: false,
        message: "Data gagal diperbarui",
        statusCode: HTTP_STATUS.NOT_FOUND,
      };
    }

    const newStatus = cart.cart.cartStatus !== "on" ? "on" : "off";

    await db
      .update(cartTable)
      .set({
        cartStatus: newStatus,
      })
      .where(eq(cartTable.cartId, cartId));

    return {
      success: true,
      message: "Data berhasil diperbarui",
      statusCode: HTTP_STATUS.OK,
    };
  }

  async cartSelectedAll(
    customerId: number,
    status: "on" | "off",
  ): Promise<CartSelectedAllServiceResult> {
    const result = await db
      .update(cartTable)
      .set({
        cartStatus: status,
      })
      .where(
        and(
          eq(cartTable.customerId, customerId),
          sql`${cartTable.productId} IN (
                    SELECT ${productTable.productId}
                    FROM ${productTable}
                    WHERE ${productTable.productStatus} = 'publish'
                )`,
        ),
      )
      .returning({
        cartId: cartTable.cartId,
      });

    if (result.length > 0) {
      return {
        success: true,
        message: "Data berhasil diperbarui",
        statusCode: HTTP_STATUS.OK,
      };
    }

    return {
      success: false,
      message: "Data gagal diperbarui",
      statusCode: HTTP_STATUS.OK,
    };
  }

  async cartSelectedMerchant(
    customerId: number,
    merchantId: number,
  ): Promise<CartSelectedMerchantServiceResult> {
    const baseCondition = and(
      eq(cartTable.customerId, customerId),
      eq(cartTable.merchantId, merchantId),
      sql`EXISTS (
            SELECT 1
            FROM ${productTable}
            WHERE ${productTable.productId} = ${cartTable.productId}
            AND ${productTable.productStatus} = 'publish'
        )`,
    );

    const [allResult] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(cartTable)
      .where(baseCondition);

    const all = Number(allResult?.count ?? 0);

    const [statusOnResult] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(cartTable)
      .where(and(baseCondition, eq(cartTable.cartStatus, "on")));

    const statusOn = Number(statusOnResult?.count ?? 0);

    const status = all === statusOn ? "off" : "on";

    const updated = await db
      .update(cartTable)
      .set({
        cartStatus: status,
      })
      .where(baseCondition)
      .returning({
        cartId: cartTable.cartId,
      });

    if (updated.length > 0) {
      return {
        success: true,
        message: "Data berhasil diperbarui",
        statusCode: HTTP_STATUS.OK,
      };
    }

    return {
      success: false,
      message: "Data gagal diperbarui",
      statusCode: HTTP_STATUS.OK,
    };
  }

  async productCheckoutV3(customerId: number): Promise<ProductCheckoutV3ServiceResult> {
    const [customerAddress] = await db
      .select({
        customerId: customerAddressTable.customerId,
        rCityId: customerAddressTable.rCityId,
      })
      .from(customerAddressTable)
      .where(
        and(
          eq(customerAddressTable.customerId, customerId),
          eq(customerAddressTable.cAddressPrimary, "1"),
        ),
      )
      .limit(1);

    const rows = await db
      .select({
        cart: cartTable,
        merchant: merchantTable,
        product: productTable,
        city: rajaongkirCityTable,
      })
      .from(merchantTable)
      .innerJoin(
        cartTable,
        and(
          eq(cartTable.merchantId, merchantTable.merchantId),
          eq(cartTable.customerId, customerId),
          eq(cartTable.cartStatus, "on"),
        ),
      )
      .innerJoin(
        productTable,
        and(
          eq(cartTable.productId, productTable.productId),
          eq(productTable.productStatus, "publish"),
        ),
      )
      .leftJoin(rajaongkirCityTable, eq(merchantTable.rCityId, rajaongkirCityTable.rCityId))
      .orderBy(desc(cartTable.cartCreate));

    if (rows.length === 0) {
      return {
        success: false,
        message: "Keranjang masih kosong. Silahkan pilih salah satu barang yang ada dikeranjang.",
        statusCode: HTTP_STATUS.OK,
      };
    }

    const merchantMap = new Map<
      number,
      {
        merchant: (typeof rows)[number]["merchant"];
        carts: Array<{
          cart: (typeof rows)[number]["cart"];
          product: (typeof rows)[number]["product"];
          variant: ProductStock | null;
          grosir: any[];
        }>;
        city: (typeof rows)[number]["city"];
      }
    >();

    for (const row of rows) {
      const merchantId = row.merchant.merchantId;

      let variant: ProductStock | null = null;

      if (row.cart.psId) {
        const [variantRow] = await db
          .select()
          .from(productStockTable)
          .where(eq(productStockTable.psId, row.cart.psId))
          .limit(1);

        variant = variantRow ?? null;
      }

      const grosir = await this.productRepository.getProductPrices(row.product.productId);

      if (!merchantMap.has(merchantId)) {
        merchantMap.set(merchantId, {
          merchant: row.merchant,
          carts: [],
          city: row.city,
        });
      }

      merchantMap.get(merchantId)!.carts.push({
        cart: row.cart,
        product: row.product,
        variant,
        grosir,
      });
    }

    let qtyMinusCheck = false;
    let productHppCheck = false;
    let productStockCheck = false;

    let flashSaleCheckMessage = "";

    const data: any[] = [];

    for (const [, merchantData] of merchantMap) {
      const merchant = merchantData.merchant;

      merchantData.carts.sort((a, b) => {
        const aTime = a.cart.cartCreate ? new Date(a.cart.cartCreate).getTime() : 0;

        const bTime = b.cart.cartCreate ? new Date(b.cart.cartCreate).getTime() : 0;

        return bTime - aTime;
      });

      const carts: any[] = [];

      for (const item of merchantData.carts) {
        const { cart, product, variant, grosir } = item;

        const ongoingFsDetail = await this.getOngoingFlashSaleDetail(product.productId);

        const price = calculateProductPrice(product, ongoingFsDetail, grosir, Number(cart.qty));

        const stock = calculateProductStock(product, ongoingFsDetail, variant);

        const cartQty = Number(cart.qty);

        if (cartQty < 0) {
          qtyMinusCheck = true;
        }

        if (Number(price.product_price) < Number(price.product_hpp)) {
          productHppCheck = true;
        }

        if (Number(stock) < cartQty) {
          productStockCheck = true;
        }

        if (ongoingFsDetail) {
          const flashSaleResult = await flashSaleCheck(
            product.productId,
            ongoingFsDetail.fsDetailId,
          );

          if (!flashSaleResult.success) {
            flashSaleCheckMessage = flashSaleResult.message;
          }
        }

        carts.push({
          ...cart,

          variant,

          product: {
            ...product,

            ongoingFsDetail,

            productPriceGrosir: grosir,

            grosir,

            productDiscount: price.product_discount,
            productPricePublish: price.product_price_publish,
            productPrice: price.product_price,
            productHpp: price.product_hpp,
            productGrosir: price.product_grosir,
            productStock: stock,
          },
        });
      }

      let codMerchant: any[] = [];

      if (customerAddress && merchant.rCityId !== null && customerAddress.rCityId !== null) {
        const dPriceFrom = merchant.rCityId;
        const dPriceTo = customerAddress.rCityId;

        codMerchant = await db
          .select()
          .from(deliveryPriceTable)
          .where(
            and(
              eq(deliveryPriceTable.dPriceFrom, dPriceFrom),
              eq(deliveryPriceTable.dPriceTo, dPriceTo),
              eq(deliveryPriceTable.dPriceStatus, "active"),
            ),
          );
      } else {
        codMerchant = [1];
      }

      const isCourier = codMerchant.length > 0;

      const isCod = codMerchant.length > 0 && merchant.merchantCod === "1";

      const { merchantPassword, ...merchantWithoutPassword } = merchant;

      data.push({
        ...merchantWithoutPassword,
        isCourier,
        isCod,
        cart: carts,
        city: merchantData.city,
      });
    }

    data.sort((a, b) => {
      const aCart = a.cart?.[0]?.cartCreate;
      const bCart = b.cart?.[0]?.cartCreate;

      const aTime = aCart ? new Date(aCart).getTime() : 0;

      const bTime = bCart ? new Date(bCart).getTime() : 0;

      return bTime - aTime;
    });

    if (!data || data.length === 0) {
      return {
        success: false,
        message: "Keranjang masih kosong. Silahkan pilih salah satu barang yang ada dikeranjang.",
        statusCode: HTTP_STATUS.OK,
      };
    }

    if (qtyMinusCheck) {
      return {
        success: false,
        message: "Terdapat produk dengan kuantitas dibawah 0",
        statusCode: HTTP_STATUS.OK,
      };
    }

    if (productHppCheck) {
      return {
        success: false,
        message: "Terdapat produk yang tidak dapat diproses. Silahkan hubungi toko telebih dahulu",
        statusCode: HTTP_STATUS.OK,
      };
    }

    if (productStockCheck) {
      return {
        success: false,
        message:
          "Terdapat produk dengan stok yang tidak mencukupi. Silahkan hubungi toko telebih dahulu",
        statusCode: HTTP_STATUS.OK,
      };
    }

    if (flashSaleCheckMessage !== "") {
      return {
        success: false,
        refresh: true,
        message: `${flashSaleCheckMessage}. Data produk berubah mohon cek kembali pesanan anda`,
        statusCode: HTTP_STATUS.OK,
      };
    }

    return {
      success: true,
      message: "Data ditemukan",
      data,
      statusCode: HTTP_STATUS.OK,
    };
  }
}
