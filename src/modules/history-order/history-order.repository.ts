import { db } from "@/libs/postgresql";
import {
  orderTable,
  orderDetailTable,
  productTable,
  productStockTable,
  productReviewTable,
  orderPaymentTable,
  orderCashbackTable,
  customerTable,
  merchantTable,
  messageEcommerceTable,
  customerAddressTable,
  rajaongkirCityTable,
  orderTrackingTable,
} from "@/db/schema";
import { eq, and, ne, or, desc, inArray, SQL } from "drizzle-orm";

export class HistoryOrderRepository {
  /**
   * Mendapatkan kondisi query berdasarkan parameter status dari Laravel:
   * - 'new': order_status = 'pending_payment' AND order_payment_type != 'cod'
   * - 'paid': order_status = 'paid'
   * - 'process': order_status = 'process' OR (order_status = 'pending_payment' AND order_payment_type = 'cod')
   * - 'pickup': order_status = 'pickup'
   * - 'finish': order_status = 'finish'
   * - 'cancel': order_status = 'cancel'
   * - 'refund': order_status = 'refund'
   */
  private getStatusConditions(status?: string): SQL<unknown> | null | undefined {
    if (!status) return null;

    switch (status) {
      case "new":
        return and(
          eq(orderTable.orderStatus, "pending_payment" as any),
          ne(orderTable.orderPaymentType, "cod" as any),
        );
      case "paid":
        return eq(orderTable.orderStatus, "paid" as any);
      case "process":
        return or(
          eq(orderTable.orderStatus, "process" as any),
          and(
            eq(orderTable.orderStatus, "pending_payment" as any),
            eq(orderTable.orderPaymentType, "cod" as any),
          ),
        );
      case "pickup":
        return eq(orderTable.orderStatus, "pickup" as any);
      case "finish":
        return eq(orderTable.orderStatus, "finish" as any);
      case "cancel":
        return eq(orderTable.orderStatus, "cancel" as any);
      case "refund":
        return eq(orderTable.orderStatus, "refund" as any);
      default:
        return null;
    }
  }

  async getHistoryOrdersCount(params: { customerId: number; status?: string }): Promise<number> {
    const { customerId, status } = params;
    const conditions = [
      eq(orderTable.customerId, customerId),
      this.getStatusConditions(status),
    ].filter(Boolean) as SQL<unknown>[];

    const result = await db
      .select({
        count: db.$count(orderTable, and(...conditions)),
      })
      .from(orderTable)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  async getHistoryOrders(params: {
    customerId: number;
    status?: string;
    page: number;
    limit: number;
  }) {
    const { customerId, status, page, limit } = params;
    const conditions = [
      eq(orderTable.customerId, customerId),
      this.getStatusConditions(status),
    ].filter(Boolean) as SQL<unknown>[];

    const offset = (page - 1) * limit;

    return await db
      .select()
      .from(orderTable)
      .where(and(...conditions))
      .orderBy(desc(orderTable.orderCreateDate))
      .limit(limit)
      .offset(offset);
  }

  // Batch query order_detail beserta product, product_stock, dan product_review customer
  async getOrderDetails(orderIds: number[], customerId: number) {
    if (orderIds.length === 0) return [];

    // Query detail
    const details = await db
      .select()
      .from(orderDetailTable)
      .where(inArray(orderDetailTable.orderId, orderIds));

    const productIds = details.map((d) => d.productId).filter(Boolean) as number[];
    const psIds = details.map((d) => d.psId).filter(Boolean) as number[];

    // Batch query product
    const products =
      productIds.length > 0
        ? await db.select().from(productTable).where(inArray(productTable.productId, productIds))
        : [];

    // Batch query product_stock
    const stocks =
      psIds.length > 0
        ? await db
            .select({
              psId: productStockTable.psId,
              psOption: productStockTable.psOption,
            })
            .from(productStockTable)
            .where(inArray(productStockTable.psId, psIds))
        : [];

    // Batch query product_review milik customer saat ini
    const reviews =
      productIds.length > 0
        ? await db
            .select({
              reviewId: productReviewTable.reviewId,
              customerId: productReviewTable.customerId,
              productId: productReviewTable.productId,
            })
            .from(productReviewTable)
            .where(
              and(
                inArray(productReviewTable.productId, productIds),
                eq(productReviewTable.customerId, customerId),
              ),
            )
        : [];

    const productsMap = new Map(products.map((p) => [p.productId, p]));
    const stocksMap = new Map(stocks.map((s) => [s.psId, s]));

    // Kelompokkan review berdasarkan productId
    const reviewsMap = new Map<number, any[]>();
    reviews.forEach((r) => {
      const pId = r.productId ?? 0;
      if (!reviewsMap.has(pId)) {
        reviewsMap.set(pId, []);
      }
      reviewsMap.get(pId)!.push({
        review_id: r.reviewId,
        customer_id: r.customerId,
        product_id: r.productId,
      });
    });

    return details.map((d) => ({
      o_detail_id: d.oDetailId,
      order_id: d.orderId,
      product_id: d.productId,
      ps_id: d.psId,
      qty: d.oDetailQty,
      // Semua kolom order_detail lainnya
      o_detail_product_name: d.oDetailProductName,
      o_detail_product_image: d.oDetailProductImage,
      o_detail_product_option: d.oDetailProductOption,
      o_detail_product_price: d.oDetailProductPrice,
      o_detail_qty: d.oDetailQty,
      o_detail_subtotal: d.oDetailSubtotal,
      o_detail_status: d.oDetailStatus,
      o_detail_create_date: d.oDetailCreateDate ? d.oDetailCreateDate.toISOString() : null,
      // Relasi: product_review (3 kolom sesuai Laravel)
      product_review: d.productId ? (reviewsMap.get(d.productId) ?? []) : [],
      // Relasi: product_stock (2 kolom sesuai Laravel ':ps_id,ps_option')
      product_stock: d.psId ? (stocksMap.get(d.psId) ?? null) : null,
      // Relasi: product — semua kolom (identik dengan Laravel eager load tanpa select restriction)
      product: d.productId ? (productsMap.get(d.productId) ?? null) : null,
    }));
  }

  // Batch query order_payment beserta cashback
  async getOrderPayments(paymentIds: number[]) {
    if (paymentIds.length === 0) return [];

    const payments = await db
      .select()
      .from(orderPaymentTable)
      .where(inArray(orderPaymentTable.oPaymentId, paymentIds));

    const cashbacks = await db
      .select({
        oPaymentId: orderCashbackTable.oPaymentId,
        oCashbackNominal: orderCashbackTable.oCashbackNominal,
        oCashbackStatus: orderCashbackTable.oCashbackStatus,
      })
      .from(orderCashbackTable)
      .where(inArray(orderCashbackTable.oPaymentId, paymentIds));

    const cashbacksMap = new Map(cashbacks.map((c) => [c.oPaymentId, c]));

    return payments.map((p) => ({
      // Semua kolom order_payment (identik dengan Laravel full model load)
      ...p,
      // Relasi: order_cashback — 3 kolom sesuai Laravel select restriction
      order_cashback: p.oPaymentId
        ? cashbacksMap.get(p.oPaymentId)
          ? {
              o_payment_id: cashbacksMap.get(p.oPaymentId)!.oPaymentId,
              o_cashback_nominal: cashbacksMap.get(p.oPaymentId)!.oCashbackNominal,
              o_cashback_status: cashbacksMap.get(p.oPaymentId)!.oCashbackStatus,
            }
          : null
        : null,
    }));
  }

  // Batch query customers — semua kolom (identik dengan Laravel full model)
  async getCustomers(customerIds: number[]) {
    if (customerIds.length === 0) return [];

    return await db
      .select()
      .from(customerTable)
      .where(inArray(customerTable.customerId, customerIds));
  }

  // Batch query merchants — semua kolom (identik dengan Laravel full model)
  async getMerchants(merchantIds: number[]) {
    if (merchantIds.length === 0) return [];

    return await db
      .select()
      .from(merchantTable)
      .where(inArray(merchantTable.merchantId, merchantIds));
  }

  // Batch query message_ecommerce — semua kolom (identik dengan Laravel full model)
  async getMessageEcommerce(customerIds: number[]) {
    if (customerIds.length === 0) return [];

    return await db
      .select()
      .from(messageEcommerceTable)
      .where(inArray(messageEcommerceTable.customerId, customerIds));
  }

  // Query order beserta merchant.address_primary.city untuk shipping tracking
  async getOrderForTracking(orderNumber: string, customerId: number) {
    const orders = await db
      .select()
      .from(orderTable)
      .where(and(eq(orderTable.orderNumber, orderNumber), eq(orderTable.customerId, customerId)))
      .limit(1);

    if (orders.length === 0) return null;

    const order = orders[0];
    if (!order) return null;

    let merchant: typeof merchantTable.$inferSelect | null = null;
    let addressPrimary: typeof customerAddressTable.$inferSelect | null = null;
    let city: typeof rajaongkirCityTable.$inferSelect | null = null;

    if (order.merchantId) {
      const merchants = await db
        .select()
        .from(merchantTable)
        .where(eq(merchantTable.merchantId, order.merchantId))
        .limit(1);

      const foundMerchant = merchants[0];
      if (foundMerchant) {
        merchant = foundMerchant;

        if (merchant.customerId) {
          const addresses = await db
            .select()
            .from(customerAddressTable)
            .where(
              and(
                eq(customerAddressTable.customerId, merchant.customerId),
                eq(customerAddressTable.cAddressPrimaryMerchant, "1"),
              ),
            )
            .limit(1);

          const foundAddress = addresses[0];
          if (foundAddress) {
            addressPrimary = foundAddress;

            if (addressPrimary.rCityId) {
              const cities = await db
                .select()
                .from(rajaongkirCityTable)
                .where(eq(rajaongkirCityTable.rCityId, addressPrimary.rCityId))
                .limit(1);

              city = cities[0] ?? null;
            }
          }
        }
      }
    }

    return {
      order,
      merchant,
      addressPrimary,
      city,
    };
  }

  // Query order tracking list terurut tracking_date DESC
  async getOrderTrackings(orderId: number) {
    return await db
      .select()
      .from(orderTrackingTable)
      .where(eq(orderTrackingTable.orderId, orderId))
      .orderBy(desc(orderTrackingTable.trackingDate));
  }
}
