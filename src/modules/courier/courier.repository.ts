import { db } from "@/libs/postgresql";
import {
  cartTable,
  productTable,
  merchantTable,
  customerAddressTable,
  deliveryPriceTable,
  rajaongkirCityTable,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export class CourierRepository {
  async getCartFirstWithMerchantCity(customerId: number, merchantId: number) {
    const result = await db
      .select({
        cart: cartTable,
        merchant: merchantTable,
        city: rajaongkirCityTable,
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
      .leftJoin(rajaongkirCityTable, eq(merchantTable.rCityId, rajaongkirCityTable.rCityId))
      .where(
        and(
          eq(cartTable.customerId, customerId),
          eq(cartTable.merchantId, merchantId),
          eq(cartTable.cartStatus, "on"),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async getCartTotalWeightGrams(customerId: number, merchantId: number): Promise<number> {
    const result = await db
      .select({
        totalWeight: sql<string>`
          SUM(
            (CASE WHEN ${productTable.productWeight}::numeric > 0
              THEN ${productTable.productWeight}::numeric
              ELSE 1000
            END) * CAST(${cartTable.qty} AS numeric)
          )
        `.as("total_weight"),
      })
      .from(cartTable)
      .innerJoin(
        productTable,
        and(
          eq(cartTable.productId, productTable.productId),
          eq(productTable.productStatus, "publish"),
        ),
      )
      .where(
        and(
          eq(cartTable.customerId, customerId),
          eq(cartTable.merchantId, merchantId),
          eq(cartTable.cartStatus, "on"),
        ),
      );

    return Number(result[0]?.totalWeight ?? 0);
  }

  async getCustomerAddressWithCity(cAddressId: number) {
    const result = await db
      .select({
        address: customerAddressTable,
        city: rajaongkirCityTable,
      })
      .from(customerAddressTable)
      .leftJoin(rajaongkirCityTable, eq(customerAddressTable.rCityId, rajaongkirCityTable.rCityId))
      .where(eq(customerAddressTable.cAddressId, cAddressId))
      .limit(1);

    return result[0] ?? null;
  }

  async getDeliveryPrice(fromCityId: number, toCityId: number) {
    const result = await db
      .select()
      .from(deliveryPriceTable)
      .where(
        and(
          eq(deliveryPriceTable.dPriceFrom, fromCityId),
          eq(deliveryPriceTable.dPriceTo, toCityId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }
}
