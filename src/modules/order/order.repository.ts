import { eq, sql } from "drizzle-orm";
import { db } from "@/libs/postgresql.ts";
import { orderTable, productTable, productStockTable, enumOrderStatus } from "@/db/schema";

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
      merchantCustomerId != null
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
    return db.query.flashsaleDetailTable.findFirst({
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
      where: (payment, { eq }) => eq(payment.oPaymentTrxId, trxId),
    });

    return payment !== undefined;
  }

  async findMerchantForOrderNumber(merchantId: number) {
    return db.query.merchantTable.findFirst({
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
      where: (order, { eq }) => eq(order.orderNumber, orderNumber),
    });

    return order !== undefined;
  }
}
