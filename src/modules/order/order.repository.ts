import { and, asc, eq, inArray, notExists, sql } from "drizzle-orm";
import { db } from "@/libs/postgresql.ts";
import {
  orderTable,
  productTable,
  productPriceTable,
  productStockTable,
  enumOrderStatus,
  cartTable,
  flashsaleDetailTable,
  orderCashbackTable,
  orderPaymentTable,
  orderDetailTable,
  promoTable,
  promoUsedTable,
  type NewOrder,
  type NewOrderCashback,
  type NewOrderDetail,
  type NewOrderPayment,
  type NewPromoUsed,
} from "@/db/schema";

export type OrderStatus = (typeof enumOrderStatus.enumValues)[number];

export class OrderRepository {
  async findOrderForFinish(orderId: number) {
    return await db.query.orderTable.findFirst({
      where: (orders, { eq, and }) =>
        and(eq(orders.orderStatus, "pickup"), eq(orders.orderId, orderId)),
      with: {
        merchant: {
          columns: {
            merchantId: true,
            customerId: true,
            merchantName: true,
          },
        },
        customer: true,
      },
    });
  }

  async updateOrderFinish(orderId: number, finishNote: string, finishDate: Date) {
    const updated = await db
      .update(orderTable)
      .set({
        orderStatus: "finish",
        orderFinishDate: finishDate,
        orderFinishNote: finishNote,
      })
      .where(eq(orderTable.orderId, orderId))
      .returning();

    return updated.length > 0;
  }

  async findFinishedOrCancelledOrder(orderId: number) {
    return await db.query.orderTable.findFirst({
      where: (orders, { eq, and, inArray }) =>
        and(
          eq(orders.orderId, orderId),
          inArray(orders.orderStatus, ["finish", "cancel", "refund"]),
        ),
    });
  }

  async findOrderForCancel(orderId: number) {
    return await db.query.orderTable.findFirst({
      where: (orders, { eq }) => eq(orders.orderId, orderId),
      with: {
        merchant: {
          columns: {
            merchantId: true,
            merchantName: true,
            customerId: true,
          },
        },
        customer: true,
      },
    });
  }

  async updateOrderCancel(
    orderId: number,
    newStatus: OrderStatus,
    cancelNote: string,
    cancelDate: Date,
  ) {
    const updated = await db
      .update(orderTable)
      .set({
        orderStatus: newStatus,
        orderCancelDate: cancelDate,
        orderCancelNote: cancelNote,
        orderRefundDate: cancelDate,
        orderRefundNote: cancelNote,
      })
      .where(eq(orderTable.orderId, orderId))
      .returning();

    return updated.length > 0;
  }

  async findOrderDetails(orderId: number) {
    return await db.query.orderDetailTable.findMany({
      where: (details, { eq }) => eq(details.orderId, orderId),
    });
  }

  async restoreOrderStock(details: Array<{ productId: number; psId: number; oDetailQty: number }>) {
    await db.transaction(async (tx) => {
      for (const item of details) {
        await tx
          .update(productTable)
          .set({
            productStock: sql`${productTable.productStock} + ${item.oDetailQty}`,
          })
          .where(eq(productTable.productId, item.productId));

        if (item.psId && item.psId !== 0) {
          await tx
            .update(productStockTable)
            .set({
              psStock: sql`${productStockTable.psStock} + ${item.oDetailQty}`,
            })
            .where(eq(productStockTable.psId, item.psId));
        }
      }
    });
  }

  async findOrderForCancelEmail(orderId: number) {
    const order = await db.query.orderTable.findFirst({
      where: (orders, { eq }) => eq(orders.orderId, orderId),
      with: {
        customer: true,
        merchant: true,
        details: true,
      },
    });

    if (!order) return null;

    const merchantCustomerId = order.merchant?.customerId;

    const addressPrimary =
      merchantCustomerId !== null && merchantCustomerId !== undefined
        ? await db.query.customerAddressTable.findFirst({
            where: (addr, { eq, and }) =>
              and(eq(addr.customerId, merchantCustomerId), eq(addr.cAddressPrimaryMerchant, "1")),
            with: {
              city: true,
            },
          })
        : undefined;

    return {
      ...order,
      order_detail: order.details,
      merchant: order.merchant
        ? {
            ...order.merchant,
            address_primary: addressPrimary ?? null,
          }
        : null,
    };
  }

  async findActiveFlashSaleDetail(productId: number, fsDetailId: number) {
    return await db.query.flashsaleDetailTable.findFirst({
      where: (detail, { and, eq }) =>
        and(
          eq(detail.fsDetailId, fsDetailId),
          eq(detail.productId, productId),
          eq(detail.fsDetailStatus, "active"),
        ),
      with: {
        flash_sale: true,
        category: true,
      },
    });
  }

  async existsOrderPaymentTrxId(trxId: string): Promise<boolean> {
    const payment = await db.query.orderPaymentTable.findFirst({
      columns: {
        oPaymentTrxId: true,
      },
      where: (row, { eq }) => eq(row.oPaymentTrxId, trxId),
    });

    return payment !== undefined;
  }

  async findMerchantForOrderNumber(merchantId: number) {
    return await db.query.merchantTable.findFirst({
      columns: {
        merchantId: true,
        merchantName: true,
      },
      where: (merchant, { eq }) => eq(merchant.merchantId, merchantId),
    });
  }

  async existsOrderNumber(orderNumber: string): Promise<boolean> {
    const order = await db.query.orderTable.findFirst({
      columns: {
        orderId: true,
      },
      where: (row, { eq }) => eq(row.orderNumber, orderNumber),
    });

    return order !== undefined;
  }

  /* =========================================================================
   * Transaction v3 (migrasi `transaction_v3` + `payment_method_request_v2`)
   * ====================================================================== */

  async findCustomerById(customerId: number) {
    return await db.query.customerTable.findFirst({
      where: (customer, { eq }) => eq(customer.customerId, customerId),
    });
  }

  async findPromoByAlias(promoAlias: string) {
    return await db.query.promoTable.findFirst({
      where: (promo, { eq }) => eq(promo.promoAlias, promoAlias),
    });
  }

  /**
   * Migrasi query Laravel:
   * PromoEcommerce::where('promo_alias', $alias)
   *   ->whereDoesntHave('promo_ecommerce_used', fn ($q) =>
   *        $q->where('customer_id', $id)
   *          ->whereRaw("EXTRACT(DAY FROM (NOW() - _promo_used.promo_used_create_date)) < (SELECT promo_periode FROM _promo WHERE promo_alias = ?)", [$alias]))
   *   ->first();
   */
  async findPromoByAliasWithinPeriod(promoAlias: string, customerId: number) {
    const [row] = await db
      .select()
      .from(promoTable)
      .where(
        and(
          eq(promoTable.promoAlias, promoAlias),
          notExists(
            db
              .select({ x: sql`1` })
              .from(promoUsedTable)
              .where(
                and(
                  eq(promoUsedTable.customerId, customerId),
                  sql`EXTRACT(DAY FROM (NOW() - ${promoUsedTable.promoUsedCreateDate})) < (SELECT promo_periode FROM _promo WHERE promo_alias = ${promoAlias})`,
                ),
              ),
          ),
        ),
      )
      .limit(1);

    return row;
  }

  /** `CustomerAddress::with('city')->where(...)->where('c_address_primary', '1')->first()` */
  async findPrimaryAddressWithCity(cAddressId: number, customerId: number) {
    return await db.query.customerAddressTable.findFirst({
      where: (address, { and, eq }) =>
        and(
          eq(address.cAddressId, cAddressId),
          eq(address.customerId, customerId),
          eq(address.cAddressPrimary, "1"),
        ),
      with: {
        city: true,
      },
    });
  }

  /** `PaymentMethod::where('payment_method_alias', $alias)->where('payment_method_status', '1')->first()` */
  async findActivePaymentMethodByAlias(paymentMethodAlias: string) {
    return await db.query.paymentMethodTable.findFirst({
      where: (method, { and, eq }) =>
        and(eq(method.paymentMethodAlias, paymentMethodAlias), eq(method.paymentMethodStatus, "1")),
    });
  }

  /**
   * Migrasi query Laravel `Cart::with(['merchant' => with('city'), 'product' => with([...]), 'variant'])`
   * + join `_product` (hanya product_status = publish) untuk cart customer (cart_status = on).
   *
   * Catatan: sub-relation `ongoing_fs_detail.order_detail` pada Laravel memakai
   * selectRaw SUM + groupBy (agregat). Karena relational query Drizzle `with` tidak
   * bisa ekspresikan agregat, nilai `count_order` dihitung lewat
   * `countFlashSaleDetailOrderQty()` (pola yang sama dengan CartRepository.getCartV3).
   */
  async findCheckoutCarts(customerId: number) {
    return await db.query.cartTable.findMany({
      where: (cart, { and, eq }) => and(eq(cart.customerId, customerId), eq(cart.cartStatus, "on")),
      with: {
        merchant: {
          columns: {
            merchantId: true,
            customerId: true,
            rCityId: true,
          },
          with: {
            city: true,
          },
        },
        product: {
          where: eq(productTable.productStatus, "publish"),
          with: {
            ongoing_fs_detail: {
              where: eq(flashsaleDetailTable.fsDetailStatus, "active"),
              limit: 1,
            },
            grosir: {
              orderBy: [asc(productPriceTable.pPriceQty)],
            },
          },
        },
        variant: true,
      },
    });
  }

  /** Agregat `SUM(_order_detail.o_detail_qty) ... GROUP BY fs_detail_id` (part of with `ongoing_fs_detail.order_detail`). */
  async countFlashSaleDetailOrderQty(fsDetailIds: readonly number[]) {
    if (fsDetailIds.length === 0) return new Map<number, number>();

    const rows = await db
      .select({
        fsDetailId: orderDetailTable.fsDetailId,
        countOrder: sql<number>`COALESCE(SUM(${orderDetailTable.oDetailQty}), 0)`.mapWith(Number),
      })
      .from(orderDetailTable)
      .where(inArray(orderDetailTable.fsDetailId, [...fsDetailIds]))
      .groupBy(orderDetailTable.fsDetailId);

    return new Map(rows.map((row) => [row.fsDetailId ?? 0, row.countOrder]));
  }

  async createOrderPayment(data: NewOrderPayment) {
    const [row] = await db.insert(orderPaymentTable).values(data).returning();
    return row;
  }

  async updateOrderPayment(oPaymentId: number, data: Partial<NewOrderPayment>) {
    const updated = await db
      .update(orderPaymentTable)
      .set(data)
      .where(eq(orderPaymentTable.oPaymentId, oPaymentId))
      .returning();

    return updated.length > 0;
  }

  async createOrder(data: NewOrder) {
    const [row] = await db.insert(orderTable).values(data).returning();
    return row;
  }

  async createOrderDetail(data: NewOrderDetail) {
    const [row] = await db.insert(orderDetailTable).values(data).returning();
    return row;
  }

  async createOrderCashback(data: NewOrderCashback) {
    const [row] = await db.insert(orderCashbackTable).values(data).returning();
    return row;
  }

  async createPromoUsed(data: NewPromoUsed) {
    const [row] = await db.insert(promoUsedTable).values(data).returning();
    return row;
  }

  async incrementPromoUsed(promoId: number) {
    await db
      .update(promoTable)
      .set({ promoUsed: sql`${promoTable.promoUsed} + 1` })
      .where(eq(promoTable.promoId, promoId));
  }

  async findProductById(productId: number) {
    return await db.query.productTable.findFirst({
      columns: {
        productId: true,
        productStock: true,
      },
      where: (product, { eq }) => eq(product.productId, productId),
    });
  }

  async updateProductStock(productId: number, productStock: number) {
    await db
      .update(productTable)
      .set({ productStock })
      .where(eq(productTable.productId, productId));
  }

  async findFlashSaleDetailById(fsDetailId: number) {
    return await db.query.flashsaleDetailTable.findFirst({
      columns: {
        fsDetailId: true,
        fsDetailProductStock: true,
      },
      where: (detail, { eq }) => eq(detail.fsDetailId, fsDetailId),
    });
  }

  async updateFlashSaleDetailStock(fsDetailId: number, fsDetailProductStock: number) {
    await db
      .update(flashsaleDetailTable)
      .set({ fsDetailProductStock })
      .where(eq(flashsaleDetailTable.fsDetailId, fsDetailId));
  }

  async findProductStockById(psId: number) {
    return await db.query.productStockTable.findFirst({
      columns: {
        psId: true,
        psStock: true,
      },
      where: (stock, { eq }) => eq(stock.psId, psId),
    });
  }

  async updateVariantStock(psId: number, psStock: number) {
    await db.update(productStockTable).set({ psStock }).where(eq(productStockTable.psId, psId));
  }

  /** `Cart::where('customer_id', ...)->where('cart_status', 'on')->delete()` */
  async deleteCustomerCarts(customerId: number) {
    await db
      .delete(cartTable)
      .where(and(eq(cartTable.customerId, customerId), eq(cartTable.cartStatus, "on")));
  }

  /** `Order::where('order_id', ...)->with('order_payment')->first()` */
  async findLastOrderWithPayment(orderId: number) {
    return await db.query.orderTable.findFirst({
      where: (row, { eq }) => eq(row.orderId, orderId),
      with: {
        order_payment: true,
      },
    });
  }

  /**
   * Data untuk `send_mail_order_v2` (mail template `orderMail` / `toMailOrder`):
   * order_payment + orders (detail, merchant + address_primary + city) + customer (whitelabel).
   */
  async findOrderPaymentForMail(oPaymentId: number) {
    const payment = await db.query.orderPaymentTable.findFirst({
      where: (row, { eq }) => eq(row.oPaymentId, oPaymentId),
    });

    if (!payment) return null;

    const orders = await db.query.orderTable.findMany({
      where: (row, { eq }) => eq(row.oPaymentId, oPaymentId),
      with: {
        details: true,
        merchant: true,
      },
    });

    const orderList = [] as Array<Record<string, unknown>>;

    for (const order of orders) {
      const merchantCustomerId = order.merchant?.customerId;

      const addressPrimary =
        merchantCustomerId !== null && merchantCustomerId !== undefined
          ? await db.query.customerAddressTable.findFirst({
              where: (addr, { and, eq }) =>
                and(eq(addr.customerId, merchantCustomerId), eq(addr.cAddressPrimaryMerchant, "1")),
              with: {
                city: true,
              },
            })
          : undefined;

      orderList.push({
        ...order,
        order_detail: order.details,
        merchant: order.merchant
          ? {
              ...order.merchant,
              address_primary: addressPrimary ?? null,
            }
          : null,
      });
    }

    const customer = await db.query.customerTable.findFirst({
      where: (row, { eq }) => eq(row.customerId, payment.customerId ?? 0),
      with: {
        whitelabel: true,
      },
    });

    return {
      ...payment,
      customer,
      order: orderList,
    };
  }
}
