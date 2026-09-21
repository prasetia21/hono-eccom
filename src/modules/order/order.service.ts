import { HTTP_STATUS } from "@/shared/constants/http-status";
import { GoogleNotifyProvider } from "@/providers/notification/google-notify.provider.ts";
import { SendMailService } from "@/providers/email/service/mail.ts";
import { orderCancelledEmail } from "@/providers/email/template/order-cancel-email.ts";
import { OrderRepository, type OrderStatus } from "./order.repository.ts";
import type {
  CancelOrderRequest,
  FinishOrderRequest,
  FlashSalePriceInput,
  FlashSaleStockInput,
  GroupedCart,
  NumericValue,
  OrderPaymentCalculationInput,
  ProductPriceInput,
  ProductPriceResult,
  ProductStockInput,
  PromoCalculationInput,
  ServiceResponse,
  ShipmentCourierInput,
  ShipmentDeliveryInput,
  VariantStockInput,
  WholesalePriceInput,
} from "./order.dto.ts";
import { randomInt } from "node:crypto";

export class OrderService {
  private repo: OrderRepository;
  private gcm: GoogleNotifyProvider;
  private mailService: SendMailService;

  constructor() {
    this.repo = new OrderRepository();
    this.gcm = new GoogleNotifyProvider();
    this.mailService = new SendMailService();
  }

  async finishOrder(payload: FinishOrderRequest): Promise<ServiceResponse> {
    const errorText =
      "Konfirmasi pesanan tidak bisa di lakukan, silahkan menghubungi customer service untuk informasi lebih lanjut";

    if (!payload.customer_status || payload.customer_status !== "active") {
      return {
        statusCode: HTTP_STATUS.OK,
        success: false,
        message: errorText,
      };
    }

    const dataIn = await this.repo.findOrderForFinish(payload.order_id);

    if (!dataIn) {
      return {
        statusCode: HTTP_STATUS.OK,
        success: false,
        message: errorText,
      };
    }

    const now = new Date();
    const update = await this.repo.updateOrderFinish(
      payload.order_id,
      payload.order_finish_note,
      now,
    );

    if (update) {
      const dataNotif: Record<string, any> = {
        ...dataIn,
        order_status: "finish",
        order_finish_date: now.toISOString().replace("T", " ").substring(0, 19),
        order_finish_note: payload.order_finish_note,
      };

      const merchantCustomerId =
        dataIn.merchant?.customerId ?? (dataIn as any).merchant?.customer_id;

      if (merchantCustomerId) {
        const orderNumber = dataIn.orderNumber ?? (dataIn as any).order_number;
        const notifTitle = "Pesanan Dikonfirmasi";
        const notifMsg = `Pesanan dengan nomor pesanan ${orderNumber} telah dikonfirmasi.`;

        await Promise.allSettled([
          this.gcm.send(
            `cus-${merchantCustomerId}`,
            "order-merchant",
            dataNotif,
            notifTitle,
            notifMsg,
          ),
          this.gcm.send(
            `cus-lite-${merchantCustomerId}`,
            "order-merchant",
            dataNotif,
            notifTitle,
            notifMsg,
          ),
        ]);
      }

      return {
        statusCode: HTTP_STATUS.OK,
        success: true,
        message: "success",
        data: "Konfirmasi pesanan berhasil",
      };
    }

    return {
      statusCode: HTTP_STATUS.OK,
      success: false,
      message: errorText,
    };
  }

  async cancelOrder(payload: CancelOrderRequest): Promise<ServiceResponse> {
    const errorText =
      "Pembatalan pesanan tidak bisa di lakukan, silahkan menghubungi customer service untuk informasi lebih lanjut";

    if (!payload.customer_status || payload.customer_status !== "active") {
      return {
        statusCode: HTTP_STATUS.OK,
        success: false,
        message: errorText,
      };
    }

    const dataIn = await this.repo.findFinishedOrCancelledOrder(payload.order_id);
    if (dataIn) {
      return {
        statusCode: HTTP_STATUS.OK,
        success: false,
        message: errorText,
      };
    }

    const dataOrder = await this.repo.findOrderForCancel(payload.order_id);
    if (!dataOrder) {
      return {
        statusCode: HTTP_STATUS.OK,
        success: false,
        message: "Order tidak ditemukan",
      };
    }

    const paymentMethodGroup =
      (dataOrder as any).payment_method_group ??
      (dataOrder as any).paymentMethodGroup ??
      (dataOrder as any).payment_method?.paymentMethodGroup;
    const currentOrderStatus = dataOrder.orderStatus ?? (dataOrder as any).order_status;

    let newOrderStatus: OrderStatus = "cancel";

    if (paymentMethodGroup === "cod") {
      newOrderStatus = "cancel";
    } else if (currentOrderStatus !== "pending_payment") {
      newOrderStatus = "refund";
    } else {
      newOrderStatus = "cancel";
    }

    const now = new Date();
    const update = await this.repo.updateOrderCancel(
      payload.order_id,
      newOrderStatus,
      payload.order_cancel_note,
      now,
    );

    const dataOrderDetail = await this.repo.findOrderDetails(payload.order_id);
    if (dataOrderDetail.length > 0) {
      const itemsToRestore = dataOrderDetail.map((d: any) => ({
        productId: Number(d.productId ?? d.product_id),
        psId: Number(d.psId ?? d.ps_id ?? 0),
        oDetailQty: Number(d.oDetailQty ?? d.o_detail_qty ?? 0),
      }));

      await this.repo.restoreOrderStock(itemsToRestore);
    }

    if (update) {
      const merchantCustomerId =
        dataOrder.merchant?.customerId ?? (dataOrder as any).merchant?.customer_id;
      const orderNumber = dataOrder.orderNumber ?? (dataOrder as any).order_number;

      const dataNotif: Record<string, any> = {
        ...dataOrder,
        order_status: newOrderStatus,
        order_cancel_date: now.toISOString().replace("T", " ").substring(0, 19),
        order_cancel_note: payload.order_cancel_note,
        customer: dataOrder.customer,
      };

      if (merchantCustomerId) {
        const notifTitle = "Pesanan Dibatalkan";
        const notifMsg = `Pesanan dengan nomor pesanan ${orderNumber} telah dibatalkan.`;

        await Promise.allSettled([
          this.gcm.send(
            `cus-${merchantCustomerId}`,
            "order-merchant",
            dataNotif,
            notifTitle,
            notifMsg,
          ),
          this.gcm.send(
            `cus-lite-${merchantCustomerId}`,
            "order-merchant",
            dataNotif,
            notifTitle,
            notifMsg,
          ),
        ]);
      }

      const orderForEmail = await this.repo.findOrderForCancelEmail(payload.order_id);
      if (orderForEmail) {
        const customerEmail =
          orderForEmail.customer?.customerEmail ?? (orderForEmail.customer as any)?.customer_email;

        if (customerEmail) {
          const subject = `Pembatalan Pesanan #${orderNumber} | eBelanja.id`;
          const hostType = process.env.NODE_ENV === "production" ? "prod" : "prod";
          const urlHost =
            hostType === "prod" ? "https://s3.belanjapasti.com" : "http://103.52.145.158:9090";

          const emailPayload: any = {
            order_number: orderNumber,
            order_cancel_note: payload.order_cancel_note,
            order_payment_type:
              (orderForEmail as any).orderPaymentType ?? (orderForEmail as any).order_payment_type,
            order_subtotal: Number(
              orderForEmail.orderSubtotal ?? (orderForEmail as any).order_subtotal ?? 0,
            ),
            order_shipment_price: Number(
              (orderForEmail as any).orderShipmentPrice ??
                (orderForEmail as any).order_shipment_price ??
                0,
            ),
            order_total: Number(
              orderForEmail.orderTotal ?? (orderForEmail as any).order_total ?? 0,
            ),
            order_shipment_address:
              (orderForEmail as any).orderShipmentAddress ??
              (orderForEmail as any).order_shipment_address,
            customer: {
              customer_name:
                orderForEmail.customer?.customerName ??
                (orderForEmail.customer as any)?.customer_name ??
                "",
              customer_msisdn:
                orderForEmail.customer?.customerMsisdn ??
                (orderForEmail.customer as any)?.customer_msisdn ??
                "",
            },
            merchant: {
              merchant_name:
                orderForEmail.merchant?.merchantName ??
                (orderForEmail.merchant as any)?.merchant_name ??
                "",
              address_primary: {
                c_address_address:
                  (orderForEmail.merchant as any)?.address_primary?.cAddressAddress ??
                  (orderForEmail.merchant as any)?.address_primary?.c_address_address,
                city: {
                  r_city_subdistrict:
                    (orderForEmail.merchant as any)?.address_primary?.city?.rCitySubdistrict ??
                    (orderForEmail.merchant as any)?.address_primary?.city?.r_city_subdistrict,
                  r_city_name:
                    (orderForEmail.merchant as any)?.address_primary?.city?.rCityName ??
                    (orderForEmail.merchant as any)?.address_primary?.city?.r_city_name,
                  r_city_province:
                    (orderForEmail.merchant as any)?.address_primary?.city?.rCityProvince ??
                    (orderForEmail.merchant as any)?.address_primary?.city?.r_city_province,
                  r_city_postcode:
                    (orderForEmail.merchant as any)?.address_primary?.city?.rCityPostcode ??
                    (orderForEmail.merchant as any)?.address_primary?.city?.r_city_postcode,
                },
              },
            },
            order_detail: ((orderForEmail as any).order_detail ?? []).map((item: any) => ({
              o_detail_product_image: item.oDetailProductImage ?? item.o_detail_product_image,
              o_detail_product_name: item.oDetailProductName ?? item.o_detail_product_name,
              o_detail_qty: Number(item.oDetailQty ?? item.o_detail_qty ?? 0),
              o_detail_product_price: Number(
                item.oDetailProductPrice ?? item.o_detail_product_price ?? 0,
              ),
              o_detail_subtotal: Number(item.oDetailSubtotal ?? item.o_detail_subtotal ?? 0),
            })),
          };

          const htmlContent = orderCancelledEmail({
            order: emailPayload,
            urlAsset: urlHost,
          });

          await this.mailService.sendMail(customerEmail, subject, htmlContent);
        }
      }

      return {
        statusCode: HTTP_STATUS.OK,
        success: true,
        message: "success",
        data: "Pesanan telah berhasil dibatalkan",
      };
    }

    return {
      statusCode: HTTP_STATUS.OK,
      success: false,
      message: errorText,
    };
  }

  private toNumber(value: NumericValue | undefined): number {
    return Number(value ?? 0);
  }

  private countPromoCbAmount(
    promo: PromoCalculationInput,
    orderPayment: OrderPaymentCalculationInput,
  ): number {
    const promoValue = this.toNumber(promo.promoValue);
    const maxDiscount = this.toNumber(promo.promoMaxDiscount);
    const subtotal = this.toNumber(orderPayment.oPaymentSubtotal);

    let promoAmount =
      promo.promoTypeValue === "nominal" ? promoValue : (promoValue / 100) * subtotal;

    if (maxDiscount !== 0 && promoAmount > maxDiscount) {
      promoAmount = maxDiscount;
    }

    return promoAmount;
  }

  private countPromoOngkirOrderPaymentAmount(
    promo: PromoCalculationInput,
    totalOngkir: NumericValue,
    groupedCart: GroupedCart,
    orderShipmentDelivery: readonly ShipmentDeliveryInput[] | null = [],
    orderShipmentCourier: readonly ShipmentCourierInput[] | null = [],
  ): number {
    const merchantIds = Object.keys(groupedCart);
    const merchantCount = merchantIds.length;

    if (merchantCount === 0) return 0;

    const promoValue = this.toNumber(promo.promoValue);
    const maxDiscount = this.toNumber(promo.promoMaxDiscount);

    let promoTotalAmount =
      promo.promoTypeValue === "nominal"
        ? promoValue
        : (promoValue / 100) * this.toNumber(totalOngkir);

    if (maxDiscount !== 0 && promoTotalAmount > maxDiscount) {
      promoTotalAmount = maxDiscount;
    }

    let finalPromoAmount = 0;

    for (const merchantId of merchantIds) {
      let shipmentPrice: number | undefined;

      if (orderShipmentDelivery?.length) {
        const shipment = orderShipmentDelivery.find(
          (item) => String(item.merchant_id) === merchantId,
        );

        shipmentPrice = this.toNumber(shipment?.item?.jumlah_pembayaran);
      }

      if (orderShipmentCourier?.length && shipmentPrice === undefined) {
        const shipment = orderShipmentCourier.find(
          (item) => String(item.merchant_id) === merchantId,
        );

        shipmentPrice = this.toNumber(shipment?.data_courier?.const?.value);
      }

      const promoPerMerchant = promoTotalAmount / merchantCount;

      let promoAmount =
        promo.promoTypeValue === "nominal"
          ? promoPerMerchant
          : (promoValue / 100) * (shipmentPrice ?? 0);

      if (maxDiscount !== 0) {
        const maxDiscountPerMerchant = maxDiscount / merchantCount;

        if (promoAmount > maxDiscountPerMerchant) {
          promoAmount = maxDiscountPerMerchant;
        }
      }

      finalPromoAmount += promoAmount;
    }

    return finalPromoAmount;
  }

  private countPromoOngkirOrderAmount(
    promo: PromoCalculationInput,
    totalOngkir: NumericValue,
    groupedCart: GroupedCart,
  ): number {
    const merchantCount = Object.keys(groupedCart).length;

    if (merchantCount === 0) {
      throw new Error("Tidak dapat menghitung promo ongkir tanpa merchant.");
    }

    const shippingAmount = this.toNumber(totalOngkir);
    const promoValue = this.toNumber(promo.promoValue);
    const maxDiscount = this.toNumber(promo.promoMaxDiscount);

    let promoAmount =
      promo.promoTypeValue === "nominal"
        ? shippingAmount / merchantCount
        : (promoValue / 100) * shippingAmount;

    if (maxDiscount !== 0) {
      const maxDiscountPerMerchant = maxDiscount / merchantCount;

      if (promoAmount > maxDiscountPerMerchant) {
        promoAmount = maxDiscountPerMerchant;
      }
    }

    return promoAmount;
  }

  private productPrice(
    product: ProductPriceInput,
    flashSale: FlashSalePriceInput | null | undefined,
    grosir: readonly WholesalePriceInput[],
    qty = 0,
  ): ProductPriceResult {
    const price: ProductPriceResult = {
      productDiscount: this.toNumber(product.productDiscount),
      productPricePublish: this.toNumber(product.productPricePublish),
      productPrice: this.toNumber(product.productPrice),
      productHpp: this.toNumber(product.productHpp),
      productGrosir: "0",
    };

    if (flashSale) {
      price.productDiscount = this.toNumber(flashSale.fsDetailProductDiscount);
      price.productPricePublish = this.toNumber(flashSale.fsDetailProductNominal);
      price.productPrice = this.toNumber(flashSale.fsDetailProductPrice);
    } else if (grosir.length > 0) {
      for (const item of grosir) {
        if (this.toNumber(item.pPriceQty) <= qty) {
          price.productGrosir = "1";
          price.productPrice = this.toNumber(item.pPriceNominal);
          price.productHpp = this.toNumber(item.pPriceHpp);
        }
      }
    }

    return price;
  }

  private productStock(
    product: ProductStockInput,
    flashSale: FlashSaleStockInput | null | undefined,
    variant: VariantStockInput | null | undefined,
  ): number {
    if (flashSale) {
      return this.toNumber(flashSale.fsDetailProductStock);
    }

    if (variant) {
      return this.toNumber(variant.psStock);
    }

    return this.toNumber(product.productStock);
  }

  private async flashSaleCheck(productId: number, fsDetailId: number, qty = 0) {
    const data = await this.repo.findActiveFlashSaleDetail(productId, fsDetailId);

    if (!data) {
      return {
        success: false as const,
        message: "Produk flash Sale tidak ditemukan!",
      };
    }

    const flashSale = data.flash_sale;

    if (flashSale == null) {
      return {
        success: false as const,
        message: "Produk flash sale tidak ditemukan",
        data,
      };
    }

    if (flashSale.fSaleStatus !== "active") {
      return {
        success: false as const,
        message: "Produk flash sale tidak aktif",
        data,
      };
    }

    if (flashSale.fSaleStartDate.getTime() > Date.now()) {
      return {
        success: false as const,
        message: `Flash sale ${data.fsDetailProductName ?? ""} belum dimulai!`,
        data,
      };
    }

    if (flashSale.fSaleEndDate.getTime() < Date.now()) {
      return {
        success: false as const,
        message: `Flash sale ${data.fsDetailProductName ?? ""} telah berakhir!`,
        data,
      };
    }

    const stock = data.fsDetailProductStock ?? 0;

    if (stock === 0) {
      return {
        success: false as const,
        message: `Produk flash sale ${data.fsDetailProductName ?? ""} habis!`,
        data,
      };
    }

    if (qty !== 0 && stock < qty) {
      return {
        success: false as const,
        message: `Stock produk flash sale ${data.fsDetailProductName ?? ""} tidak mencukupi!`,
        data,
      };
    }

    return {
      success: true as const,
      message: "Produk flash sale ditemukan!",
      data,
    };
  }

  private createTransactionPatterns(): {
    pattern0: string;
    pattern1: string;
  } {
    const now = new Date();
    const unixSeconds = Math.floor(now.getTime() / 1000);

    const year = Number(
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(now),
    );

    const pattern0 = String(Number(String(unixSeconds).slice(0, 4)) + year).slice(0, 3);

    const pattern1 = String(now.getMilliseconds()).padStart(3, "0");

    return {
      pattern0,
      pattern1,
    };
  }

  private async generateTrxId(): Promise<string> {
    while (true) {
      const { pattern0, pattern1 } = this.createTransactionPatterns();

      const pattern2 = randomInt(111111, 1000000);

      const trxId = `${pattern0}${pattern1}${pattern2}`;

      const exists = await this.repo.existsOrderPaymentTrxId(trxId);

      if (!exists) return trxId;
    }
  }

  private async orderNumber(merchantId: number): Promise<string> {
    const merchant = await this.repo.findMerchantForOrderNumber(merchantId);

    if (!merchant || merchant.merchantName == null) {
      throw new Error("Merchant atau nama merchant tidak ditemukan.");
    }

    const merchantCode = merchant.merchantName.replace(/ /g, "").slice(0, 2).toUpperCase();

    while (true) {
      const { pattern0, pattern1 } = this.createTransactionPatterns();

      const pattern2 = randomInt(1111, 10000);

      const generatedNumber = `${merchantCode}${pattern0}${pattern1}${pattern2}`;

      const exists = await this.repo.existsOrderNumber(generatedNumber);

      if (!exists) return generatedNumber;
    }
  }
}
