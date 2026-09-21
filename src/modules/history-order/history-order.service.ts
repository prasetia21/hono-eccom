import { HistoryOrderRepository } from "./history-order.repository";
import type {
  GetHistoryOrderRequest,
  GetHistoryOrderServiceResult,
  GetShippingTrackingRequest,
  GetShippingTrackingServiceResult,
} from "./history-order.dto";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { createPaginatedResponse } from "@/shared/utils/pagination";
import { toSnakeCase } from "@/shared/utils/case-transform";

export class HistoryOrderService {
  private repository: HistoryOrderRepository;

  constructor() {
    this.repository = new HistoryOrderRepository();
  }

  async getHistoryOrder(
    payload: GetHistoryOrderRequest,
    fullUrl: string,
  ): Promise<GetHistoryOrderServiceResult> {
    const { status, customer_id = "0", page = 1, limit = 20 } = payload;
    const customerId = parseInt(customer_id, 10);

    // 1. Dapatkan total count dan data order (paginated)
    const total = await this.repository.getHistoryOrdersCount({ customerId, status });
    const orders = await this.repository.getHistoryOrders({ customerId, status, page, limit });

    if (orders.length === 0) {
      const emptyPaginated = createPaginatedResponse([], total, page, limit, fullUrl);
      return {
        success: true,
        message: "Data ditemukan",
        data: emptyPaginated as any,
        statusCode: HTTP_STATUS.OK,
      };
    }

    // 2. Ekstrak IDs untuk batch querying
    const orderIds = orders.map((o) => o.orderId);
    const paymentIds = orders.map((o) => o.oPaymentId).filter(Boolean) as number[];
    const customerIds = orders.map((o) => o.customerId).filter(Boolean) as number[];
    const merchantIds = orders.map((o) => o.merchantId).filter(Boolean) as number[];

    // 3. Batch query relasi-relasinya secara paralel
    const [detailsList, paymentsList, customersList, merchantsList, messagesList] =
      await Promise.all([
        this.repository.getOrderDetails(orderIds, customerId),
        this.repository.getOrderPayments(paymentIds),
        this.repository.getCustomers(customerIds),
        this.repository.getMerchants(merchantIds),
        this.repository.getMessageEcommerce(customerIds),
      ]);

    // 4. Buat mapping hasil batch query
    const detailsMap = new Map<number, any[]>();
    detailsList.forEach((d) => {
      const oId = d.order_id ?? 0;
      if (!detailsMap.has(oId)) {
        detailsMap.set(oId, []);
      }
      detailsMap.get(oId)!.push(d);
    });

    const paymentsMap = new Map(paymentsList.map((p) => [p.oPaymentId, p]));
    const customersMap = new Map(customersList.map((c) => [c.customerId, c]));
    const merchantsMap = new Map(merchantsList.map((m) => [m.merchantId, m]));
    const messagesMap = new Map(messagesList.map((msg) => [msg.customerId, msg]));

    // 5. Susun (hydrate) objek order lengkap dengan relasinya
    const transformedOrders = orders.map((o) => {
      const orderDetails = detailsMap.get(o.orderId) ?? [];
      const orderPayment = o.oPaymentId ? (paymentsMap.get(o.oPaymentId) ?? null) : null;
      const customer = o.customerId ? (customersMap.get(o.customerId) ?? null) : null;
      const merchant = o.merchantId ? (merchantsMap.get(o.merchantId) ?? null) : null;
      const messageEcommerce = o.customerId ? (messagesMap.get(o.customerId) ?? null) : null;

      return {
        order_id: o.orderId,
        order_number: o.orderNumber,
        o_payment_id: o.oPaymentId,
        customer_id: o.customerId,
        merchant_id: o.merchantId,
        driver_id: o.driverId,
        order_shipment_type: o.orderShipmentType,
        order_payment_type: o.orderPaymentType,
        payment_method_id: o.paymentMethodId,
        payment_method_group: o.paymentMethodGroup,
        payment_method_name: o.paymentMethodName,
        payment_method_desc: o.paymentMethodDesc,
        order_subtotal: o.orderSubtotal,
        order_tax: o.orderTax,
        order_discount_price: o.orderDiscountPrice,
        order_shipment_price: o.orderShipmentPrice,
        order_shipment_discount: o.orderShipmentDiscount,
        order_insurance: o.orderInsurance,
        order_unique_code: o.orderUniqueCode,
        order_admin_3rdparty: o.orderAdmin3rdparty,
        order_total: o.orderTotal,
        order_bank_from_account: o.orderBankFromAccount,
        order_bank_from_number: o.orderBankFromNumber,
        order_bank_from_branch: o.orderBankFromBranch,
        order_shipment_cost: o.orderShipmentCost,
        order_shipment_courier: o.orderShipmentCourier,
        order_shipment_package: o.orderShipmentPackage,
        order_shipment_time: o.orderShipmentTime,
        order_shipment_date: o.orderShipmentDate ? o.orderShipmentDate.toISOString() : null,
        r_city_id: o.rCityId,
        order_shipment_to: o.orderShipmentTo,
        order_shipment_address: o.orderShipmentAddress,
        order_shipment_lat: o.orderShipmentLat,
        order_shipment_lng: o.orderShipmentLng,
        order_shipment_note: o.orderShipmentNote,
        order_shipment_phone: o.orderShipmentPhone,
        order_shipment_resi: o.orderShipmentResi,
        order_status: o.orderStatus,
        order_pending_payment_date: o.orderPendingPaymentDate
          ? o.orderPendingPaymentDate.toISOString()
          : null,
        order_pending_payment_note: o.orderPendingPaymentNote,
        order_paid_date: o.orderPaidDate ? o.orderPaidDate.toISOString() : null,
        order_paid_note: o.orderPaidNote,
        order_process_date: o.orderProcessDate ? o.orderProcessDate.toISOString() : null,
        order_process_note: o.orderProcessNote,
        order_pickup_date: o.orderPickupDate ? o.orderPickupDate.toISOString() : null,
        order_pickup_note: o.orderPickupNote,
        order_finish_date: o.orderFinishDate ? o.orderFinishDate.toISOString() : null,
        order_finish_note: o.orderFinishNote,
        order_cancel_date: o.orderCancelDate ? o.orderCancelDate.toISOString() : null,
        order_cancel_note: o.orderCancelNote,
        order_refund_date: o.orderRefundDate ? o.orderRefundDate.toISOString() : null,
        order_refund_note: o.orderRefundNote,
        order_create_date: o.orderCreateDate ? o.orderCreateDate.toISOString() : null,
        order_detail: orderDetails,
        order_payment: orderPayment,
        customer,
        merchant,
        message_ecommerce: messageEcommerce,
      };
    });

    // 6. Buat paginated response dan transformasi casing response
    const paginatedData = createPaginatedResponse(transformedOrders, total, page, limit, fullUrl);
    const snakeCaseData = toSnakeCase(paginatedData);

    return {
      success: true,
      message: "Data ditemukan",
      data: snakeCaseData as any,
      statusCode: HTTP_STATUS.OK,
    };
  }

  async getShippingTracking(
    payload: GetShippingTrackingRequest,
  ): Promise<GetShippingTrackingServiceResult> {
    const { order_number, customer_id = "0" } = payload;
    const customerId = parseInt(customer_id, 10);

    const orderData = await this.repository.getOrderForTracking(order_number, customerId);

    if (!orderData) {
      return {
        success: false,
        message: "order tidak ditemukan",
        statusCode: HTTP_STATUS.OK,
      };
    }

    const { order, merchant, addressPrimary, city } = orderData;

    const trackings = await this.repository.getOrderTrackings(order.orderId);

    const trackingList = trackings.map((t) => ({
      tracking_id: t.trackingId,
      order_id: t.orderId,
      tracking_title: t.trackingTitle,
      tracking_desc: t.trackingDesc ?? null,
      tracking_date: t.trackingDate ? t.trackingDate.toISOString() : null,
      tracking_status: t.trackingStatus ?? null,
      tracking_create_date: t.trackingCreateDate ? t.trackingCreateDate.toISOString() : null,
    }));

    let senderAddress = "";
    if (addressPrimary && city) {
      const cAddress = addressPrimary.cAddressAddress ?? "";
      const subdistrict = city.rCitySubdistrict ?? "";
      const cityName = city.rCityName ?? "";
      const province = city.rCityProvince ?? "";
      const postcode = city.rCityPostcode ?? "";
      senderAddress = `${cAddress}, ${subdistrict}, ${cityName}, ${province} ${postcode}`;
    } else if (addressPrimary) {
      senderAddress = addressPrimary.cAddressAddress ?? "";
    } else if (merchant) {
      senderAddress = merchant.merchantAddress ?? "";
    }

    const res = {
      Waybill_number: order.orderShipmentResi ?? null,
      Courier: order.orderShipmentCourier ?? null,
      Service: order.orderShipmentPackage ?? null,
      Sender: merchant?.merchantName ?? null,
      Sender_address: senderAddress,
      Receiver_address: order.orderShipmentAddress ?? null,
      Receiver_name: order.orderShipmentTo ?? null,
      Track_history: trackingList,
      Last_status: trackingList.length > 0 ? trackingList[0] : null,
    };

    return {
      success: true,
      message: "Permintaan tracking berhasil",
      data: res,
      statusCode: HTTP_STATUS.OK,
    };
  }
}
