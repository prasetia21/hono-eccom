import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { GoogleNotifyProvider } from "@/providers/notification/google-notify.provider.ts";
import { SendMailService } from "@/providers/email/service/mail.ts";
import { orderCancelledEmail } from "@/providers/email/template/order-cancel-email.ts";
import { orderMail } from "@/providers/email/template/order-mail.ts";
import { XfersService } from "@/providers/payment/exfers.provider.ts";
import { WinPayService } from "@/providers/payment/winpay.provider.ts";
import { XenditService } from "@/providers/payment/xendit.provider.ts";
import { BalanceService } from "@/providers/balance/balance.provider.ts";
import { ProductPointService } from "@/modules/product-point/product-point.service.ts";
import { envSchema } from "@/config/env.ts";
import { md5, sha256 } from "@/shared/utils/crypto-helper.ts";
import { redisAcquireLock } from "@/libs/redis.ts";
import { toSnakeCase } from "@/shared/utils/case-transform.ts";
import { formatDate, toISO8601String } from "@/shared/utils/date.ts";
import { pinoLogger } from "@/libs/logger.ts";
import { OrderRepository, type OrderStatus } from "./order.repository.ts";
import type {
  CancelOrderRequest,
  CheckoutCartItem,
  FinishOrderRequest,
  FlashSalePriceInput,
  FlashSaleStockInput,
  GroupedCart,
  GroupedCheckoutCarts,
  NumericValue,
  OrderPaymentCalculationInput,
  PaymentMethodData,
  PaymentMethodRequestInput,
  ProductCartNoteInput,
  ProductPriceInput,
  ProductPriceResult,
  ProductStockInput,
  PromoCalculationInput,
  ServiceResponse,
  ShipmentCourierInput,
  ShipmentDeliveryInput,
  TransactionAuthData,
  TransactionV3Request,
  TransactionV3Result,
  VariantStockInput,
  WholesalePriceInput,
} from "./order.dto.ts";
import { randomInt } from "node:crypto";

type OrderPaymentRow = NonNullable<Awaited<ReturnType<OrderRepository["createOrderPayment"]>>>;
type OrderRow = NonNullable<Awaited<ReturnType<OrderRepository["createOrder"]>>>;
type CustomerAddressWithCity = NonNullable<
  Awaited<ReturnType<OrderRepository["findPrimaryAddressWithCity"]>>
>;
type PromoTransactionData = PromoCalculationInput & {
  promoId: number;
  promoSection: string | null;
};

export class OrderService {
  private repo: OrderRepository;
  private gcmInstance: GoogleNotifyProvider | null = null;
  private mailService: SendMailService;
  private balanceService: BalanceService;
  private productPointService: ProductPointService;

  constructor() {
    this.repo = new OrderRepository();
    this.mailService = new SendMailService();
    this.balanceService = new BalanceService();
    this.productPointService = new ProductPointService();
  }

  private get gcm(): GoogleNotifyProvider {
    this.gcmInstance ??= new GoogleNotifyProvider();
    return this.gcmInstance;
  }

  private async sendGcm(
    merchantCustomerId: number,
    event: string,
    dataNotif: Record<string, unknown>,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      await Promise.allSettled([
        this.gcm.send(`cus-${merchantCustomerId}`, event, dataNotif, title, message),
        this.gcm.send(`cus-lite-${merchantCustomerId}`, event, dataNotif, title, message),
      ]);
    } catch {
      // notifikasi best-effort: kegagalan FCM tidak membatalkan proses order
    }
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

        await this.sendGcm(merchantCustomerId, "order-merchant", dataNotif, notifTitle, notifMsg);
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

        await this.sendGcm(merchantCustomerId, "order-merchant", dataNotif, notifTitle, notifMsg);
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

  /* =========================================================================
   * Transaction v3 — migrasi `OrderController::transaction_v3` (Laravel).
   * Urutan business logic disamakan dengan kode Laravel.
   * ====================================================================== */

  async transactionV3(
    payload: TransactionV3Request,
    authData: TransactionAuthData,
  ): Promise<TransactionV3Result> {
    const fail = (message: string | string[], errorCode?: string): TransactionV3Result => ({
      statusCode: HTTP_STATUS.OK,
      success: false,
      message,
      ...(errorCode ? { error_code: errorCode } : {}),
    });

    const customerId = Number(authData.customer_id ?? 0);
    const paymentMethodAlias = (payload.payment_method ?? "").trim();
    const promoAlias = (payload.promo_alias ?? "").trim();
    const deliveryList: readonly ShipmentDeliveryInput[] = payload.order_shipment_delivery ?? [];
    const courierList: readonly ShipmentCourierInput[] = payload.order_shipment_courier ?? [];

    // 1. cek customer
    const dataCust = await this.repo.findCustomerById(customerId);

    if (!dataCust || dataCust.customerStatus !== "active") {
      return fail(
        "Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!",
        "0001",
      );
    }

    // 2. validator: payment_method + customer_address wajib diisi
    const validatorErrors: string[] = [];

    if (!paymentMethodAlias) {
      validatorErrors.push("The payment method field is required.");
    }
    if (!payload.customer_address) {
      validatorErrors.push("The customer address field is required.");
    }
    if (validatorErrors.length > 0) {
      return {
        statusCode: HTTP_STATUS.OK,
        success: false,
        message: validatorErrors,
      };
    }

    // 3. promo validation
    let promoRow = promoAlias ? await this.repo.findPromoByAlias(promoAlias) : null;

    if (promoAlias) {
      if (!promoRow) {
        return fail("Promo sudah tidak tersedia mohon gunakan promo lainnya.");
      }

      if (Number(promoRow.promoQty ?? 0) <= Number(promoRow.promoUsed ?? 0)) {
        return fail(
          "Promo sudah tidak tersedia atau sudah melampaui batas penggunaan. Mohon gunakan promo lainnya",
        );
      }

      // check promo payment method
      const promoPmNames: Record<string, string> = {
        saldo: "Saldo",
        cod: "COD",
        direct_debit: "Debit Instan",
        debit: "Debit Instan",
        va: "Virtual Account",
      };
      const pmName =
        promoPmNames[promoRow.promoPaymentMethod ?? ""] ?? promoRow.promoPaymentMethod ?? "";

      if (paymentMethodAlias !== promoRow.promoPaymentMethod) {
        return fail(`Promo yang anda gunakan harus menggunakan metode pembayaran ${pmName}`);
      }

      // check promo period
      const promoInPeriod = await this.repo.findPromoByAliasWithinPeriod(promoAlias, customerId);

      if (!promoInPeriod) {
        return fail(
          `Periode voucher ${promoRow.promoPeriode} hari, anda bisa menggunakan voucher ini kembali setelah periode berakhir.`,
        );
      }
    }

    // 4. check pin transaksi
    if (paymentMethodAlias === "saldo") {
      const pin = payload.pin;

      if (!pin) {
        return fail("Anda belum memasukkan PIN transaksi");
      }

      const pinEnc = sha256(
        sha256(`${dataCust.customerPhone ?? ""}${dataCust.customerCode ?? ""}`) +
          md5(md5(md5(md5(sha256(pin))))) +
          envSchema.SECRET_KEY +
          (dataCust.customerEmail ?? ""),
      );

      if (md5(pinEnc) !== dataCust.customerPasswordTrx) {
        return fail("PIN yang anda masukkan salah");
      }
    }

    // 5. address check
    const customerAddr = await this.repo.findPrimaryAddressWithCity(
      Number(payload.customer_address),
      customerId,
    );

    if (!customerAddr) {
      return fail("Alamat customer tidak ditemukan.");
    }

    // 6. cod check
    if (paymentMethodAlias === "cod" && deliveryList.length === 0) {
      return fail(
        "Metode pembayaran cod hanya bisa digunakan ketika menggunakan pengiriman via delivery.",
      );
    }

    // 7. payment method check
    const paymentMethod = await this.repo.findActivePaymentMethodByAlias(paymentMethodAlias);

    if (!paymentMethod) {
      return fail("Metode pembayaran tidak ditemukan.");
    }

    // 8. cart & product check
    let qtyMinusCheck = false;
    let productHppCheck = false;
    let productStockCheck = false;
    let flashSaleCheckMsg = "";

    const cartRows = await this.repo.findCheckoutCarts(customerId);

    // ekuivalen inner join `_product` product_status = 'publish' pada query Laravel
    const visibleCarts = cartRows.filter((row) => row.product !== null);

    // agregat `ongoing_fs_detail.order_detail` (SUM qty per fs_detail_id)
    const fsDetailIds = [
      ...new Set(
        visibleCarts
          .map((row) => row.product?.ongoing_fs_detail?.[0]?.fsDetailId ?? null)
          .filter((id): id is number => id !== null),
      ),
    ];
    const fsOrderCountMap = await this.repo.countFlashSaleDetailOrderQty(fsDetailIds);

    const cartData: CheckoutCartItem[] = [];

    for (const row of visibleCarts) {
      const product = row.product!;
      const grosir = (product.grosir ?? []) as unknown as WholesalePriceInput[];
      const ongoingFsDetail = (product.ongoing_fs_detail?.[0] ?? null) as
        | (Record<string, unknown> & {
            fsDetailId: number;
          })
        | null;
      const qty = Number(row.qty ?? 0);

      const price = this.productPrice(
        product as unknown as ProductPriceInput,
        ongoingFsDetail as unknown as FlashSalePriceInput | null,
        grosir,
        qty,
      );
      const stock = this.productStock(
        product as unknown as ProductStockInput,
        ongoingFsDetail as unknown as FlashSaleStockInput | null,
        row.variant as unknown as VariantStockInput | null,
      );

      const item: CheckoutCartItem = {
        ...row,
        qty,
        product: {
          ...product,
          ongoing_fs_detail: ongoingFsDetail
            ? {
                ...ongoingFsDetail,
                order_detail: [
                  {
                    fs_detail_id: ongoingFsDetail.fsDetailId,
                    count_order: fsOrderCountMap.get(ongoingFsDetail.fsDetailId) ?? 0,
                  },
                ],
              }
            : null,
          grosir,
        },
        variant: (row.variant as unknown as VariantStockInput | null) ?? null,
        productStock: stock,
        productDiscount: price.productDiscount,
        productPricePublish: price.productPricePublish,
        productPrice: price.productPrice,
        productPriceHpp: price.productHpp,
        productGrosir: price.productGrosir,
        productWeight: product.productWeight,
        totalAmountHpp: price.productHpp * qty,
        totalAmount: price.productPrice * qty,
      };

      if (qty < 0) {
        qtyMinusCheck = true;
      }
      if (price.productPrice < price.productHpp) {
        productHppCheck = true;
      }
      if (stock < qty) {
        productStockCheck = true;
      }
      if (ongoingFsDetail) {
        const dataFlash = await this.flashSaleCheck(item.productId, ongoingFsDetail.fsDetailId);
        if (!dataFlash.success) {
          flashSaleCheckMsg = dataFlash.message;
        }
      }

      cartData.push(item);
    }

    if (cartData.length === 0) {
      return fail("Keranjang masih kosong. Silahkan pilih salah satu barang yang ada dikeranjang.");
    }
    if (qtyMinusCheck) {
      return fail("Keranjang masih kosong. Silahkan pilih salah satu barang yang ada dikeranjang.");
    }
    if (productHppCheck) {
      return fail(
        "Terdapat produk yang tidak dapat diproses. Silahkan hubungi toko telebih dahulu",
      );
    }
    if (productStockCheck) {
      return fail(
        "Terdapat produk dengan stok yang tidak mencukupi. Silahkan hubungi toko telebih dahulu",
      );
    }
    if (flashSaleCheckMsg !== "") {
      return {
        statusCode: HTTP_STATUS.OK,
        success: false,
        refresh: true,
        message: `${flashSaleCheckMsg}. Data produk berubah mohon cek kembali pesanan anda`,
      };
    }

    // 9. shipment price
    let orderShipmentPackage = 0;

    if (deliveryList.length > 0 || courierList.length > 0) {
      if (deliveryList.length > 0) {
        for (const delivery of deliveryList) {
          orderShipmentPackage += Number(delivery.item?.jumlah_pembayaran ?? 0);
        }
      }
      if (courierList.length > 0) {
        for (const courier of courierList) {
          orderShipmentPackage += Number(courier.data_courier?.const?.value ?? 0);
        }
      }
    } else {
      return fail("Order gagal,metode pengiriman tidak ditemukan.");
    }

    // 10. count total
    const subTotal = cartData.reduce((total, item) => total + Number(item.totalAmount ?? 0), 0);
    const orderTotal = subTotal + orderShipmentPackage;

    // 11. lock (ekuivalen Cache::lock pada Laravel)
    const raceLockAcquired = await redisAcquireLock(
      `apps:race:order_transactionv3:${customerId}`,
      5,
    );

    if (!raceLockAcquired) {
      return fail("Tunggu 5 detik untuk melakukan transaksi lagi.", "0001");
    }

    const paymentGroup = String(paymentMethod.paymentMethodGroup ?? "");
    const trxLockAcquired = await redisAcquireLock(
      `apps:order_transactionv3:${customerId}:${paymentGroup}:${orderTotal}`,
      180,
    );

    if (!trxLockAcquired) {
      return fail(
        "Ada transaksi sebelumnya sedang berlangsung. Silahkan cek histori transaksi.",
        "0001",
      );
    }

    const balance = await this.balanceService.get(authData as never, true);

    // cek saldo
    if (paymentMethod.paymentMethodAlias === "saldo" && balance < orderTotal) {
      return fail("Uang Muka tidak cukup untuk melakukan transaksi ini");
    }

    let paymentType = "";
    let status = "";
    let orderPaymentStatus = "";

    switch (paymentGroup) {
      case "saldo":
        paymentType = "balance";
        status = "success";
        orderPaymentStatus = "paid";
        break;
      case "cod":
        paymentType = "cod";
        status = "pending";
        orderPaymentStatus = "pending_payment";
        break;
      case "debit":
        paymentType = "debit";
        status = "pending";
        orderPaymentStatus = "pending_payment";
        break;
      case "direct_debit":
        paymentType = "debit";
        status = "pending";
        orderPaymentStatus = "pending_payment";
        break;
      case "va":
        paymentType = "va";
        status = "pending";
        orderPaymentStatus = "pending_payment";
        break;
      case "qris":
        paymentType = "qris";
        status = "pending";
        orderPaymentStatus = "pending_payment";
        break;
      case "retail":
        paymentType = "retail";
        status = "pending";
        orderPaymentStatus = "pending_payment";
        break;
      default:
        paymentType = "";
        status = "cancel";
        orderPaymentStatus = "cancel";
    }

    // 12. grouping cart by merchant
    const groupedCart: GroupedCheckoutCarts = {};

    for (const item of cartData) {
      const key = String(item.merchantId);
      (groupedCart[key] ??= []).push(item);
    }

    // 13. handle promo ongkir di tabel payment_order
    promoRow = promoAlias ? (promoRow ?? (await this.repo.findPromoByAlias(promoAlias))) : promoRow;

    if (deliveryList.length > 0 || courierList.length > 0) {
      if (promoAlias && promoRow && promoRow.promoSection === "shipment") {
        const promoNominal = this.countPromoOngkirOrderPaymentAmount(
          promoRow as PromoCalculationInput,
          orderShipmentPackage,
          groupedCart,
          deliveryList,
          courierList,
        );
        orderShipmentPackage =
          orderShipmentPackage - promoNominal < 0 ? 0 : orderShipmentPackage - promoNominal;
      }
    }

    const promoData = promoRow as (typeof promoRow & PromoCalculationInput) | null;

    if (Math.trunc(subTotal) < 0) {
      return fail("Subtotal tidak boleh minus/dibawah 0.");
    }
    if (Math.trunc(orderShipmentPackage) < 0) {
      return fail("Total kurir tidak boleh minus/dibawah 0.");
    }
    if (Math.trunc(orderTotal) < 0) {
      return fail("Total tidak boleh minus/dibawah 0.");
    }

    const shipmentAddress = this.buildShipmentAddress(customerAddr);
    const orderShipmentNote = payload.order_shipment_note ?? "";

    // 14. retail / va / qris → payment_method_request_v2
    if (paymentGroup === "retail" && orderTotal < 10000) {
      return fail("Minimal Pembayaran 10.000");
    } else if (paymentGroup === "retail" || paymentGroup === "va" || paymentGroup === "qris") {
      const param: PaymentMethodRequestInput = {
        vendor: payload.vendor ?? "",
        type: payload.type ?? "",
        paymentMethod: paymentMethod as unknown as PaymentMethodData,
        paymentMethodAlias,
        paymentType,
        status,
        orderPaymentStatus,
        subTotal,
        orderTotal,
        orderShipmentPackage,
        orderShipmentNote,
      };

      return await this.paymentMethodRequestV2(
        param,
        customerAddr,
        groupedCart,
        courierList,
        deliveryList,
        authData,
      );
    }

    // 15. jalur saldo / cod / debit — buat order payment + order langsung
    const now = new Date();

    const orderPayment = await this.repo.createOrderPayment({
      customerId,
      paymentMethodId: paymentMethod.paymentMethodId,
      oPaymentCode: `INV/${this.jakartaDateCode()}`,
      oPaymentTrxId: await this.generateTrxId(),
      oPaymentType: paymentType as never,
      oPaymentGroup: paymentGroup,
      oPaymentName: paymentMethod.paymentMethodName,
      oPaymentDesc: paymentMethod.paymentMethodDesc,
      oPaymentBank: paymentMethod.paymentMethod3rdparty,
      oPaymentSubtotal: String(Math.trunc(subTotal)),
      oPaymentService: String(Math.trunc(orderShipmentPackage)),
      oPaymentTotal: String(Math.trunc(orderTotal)),
      oPaymentStatus: status as never,
      oPaymentCreateDate: now,
    });

    if (!orderPayment) {
      return fail(
        "Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!",
        "0002",
      );
    }

    const dataNotif: {
      customer: TransactionAuthData;
      order_payment: OrderPaymentRow;
      order: Array<Record<string, unknown>>;
    } = {
      customer: authData,
      order_payment: orderPayment,
      order: [],
    };

    const created = await this.createOrdersFromGroupedCart({
      orderPayment,
      paymentType,
      orderPaymentStatus,
      paymentMethod: paymentMethod as unknown as PaymentMethodData,
      orderShipmentNote,
      groupedCart,
      orderShipmentCourier: courierList,
      orderShipmentDelivery: deliveryList,
      customerAddr,
      shipmentAddress,
      adminFeePerMerchant: null,
      promo: promoData as PromoTransactionData | null,
      promoAlias: promoAlias || null,
      productCartNotes: payload.product_cart_notes ?? null,
      authData,
      totalShipmentForPromo: orderShipmentPackage,
      dataNotif,
    });

    if (!created.success) {
      return fail(created.message, created.errorCode);
    }

    await this.repo.deleteCustomerCarts(customerId);
    await this.sendOrderMail(orderPayment.oPaymentId);

    const lastOrder = created.lastOrder
      ? await this.repo.findLastOrderWithPayment(created.lastOrder.orderId)
      : null;

    return {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Order berhasil, order anda sedang diproses.",
      dataNotif: toSnakeCase(dataNotif),
      order: toSnakeCase(lastOrder),
    };
  }

  /* =========================================================================
   * Payment method request v2 — migrasi `OrderController::payment_method_request_v2`.
   * Membuat order payment untuk retail / va / qris lalu memanggil vendor payment
   * (XFERS VA, Winpay QRIS, Xendit retail) sesuai `payment_method_3rdparty`.
   * ====================================================================== */

  async paymentMethodRequestV2(
    data: PaymentMethodRequestInput,
    customerAddr: CustomerAddressWithCity,
    groupedCart: GroupedCheckoutCarts,
    orderShipmentCourier: readonly ShipmentCourierInput[],
    orderShipmentDelivery: readonly ShipmentDeliveryInput[],
    authData: TransactionAuthData,
  ): Promise<TransactionV3Result> {
    const fail = (message: string | string[], errorCode?: string): TransactionV3Result => ({
      statusCode: HTTP_STATUS.OK,
      success: false,
      message,
      ...(errorCode ? { error_code: errorCode } : {}),
    });

    let tutorial: unknown = null;

    const paymentGroup = String(data.paymentMethod.paymentMethodGroup ?? "");

    // qris: `payment_method_admin_price` diperlakukan sebagai persentase
    let adminFee = Number(data.paymentMethod.paymentMethodAdminPrice ?? 0);

    if (paymentGroup === "qris") {
      adminFee = Math.ceil(((data.subTotal + data.orderShipmentPackage) * adminFee) / 100);
    }

    const now = new Date();

    const orderPayment = await this.repo.createOrderPayment({
      customerId: Number(authData.customer_id ?? 0),
      paymentMethodId: data.paymentMethod.paymentMethodId,
      oPaymentTrxId: await this.generateTrxId(),
      oPaymentCode: `INV/${this.jakartaDateCode()}`,
      oPaymentType: data.paymentType as never,
      oPaymentGroup: paymentGroup,
      oPaymentName: data.paymentMethod.paymentMethodName,
      oPaymentDesc: data.paymentMethod.paymentMethodDesc,
      oPaymentBank: data.paymentMethod.paymentMethod3rdparty,
      oPaymentSubtotal: String(data.subTotal),
      oPaymentService: String(data.orderShipmentPackage),
      oPaymentAdminFee: String(adminFee),
      oPaymentTotal: String(data.subTotal + adminFee + data.orderShipmentPackage),
      oPaymentStatus: data.status as never,
      oPaymentVaBank: "",
      oPaymentVaNumber: "",
      oPaymentVaBankRefid: "",
      oPaymentRetailBank: "",
      oPaymentRetailCode: "",
      oPaymentRetailBankRefid: "",
      oPaymentCreateDate: now,
    });

    if (!orderPayment) {
      return fail(
        "Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!",
        "0002",
      );
    }

    const bankName = String(orderPayment.oPaymentBank ?? "");

    /** Proses order + order detail + stok + promo + notif setelah vendor payment sukses. */
    const finalize = async (paymentRow: OrderPaymentRow, withTutorial: boolean) => {
      const dataNotif: {
        customer: TransactionAuthData;
        order_payment: OrderPaymentRow;
        order: Array<Record<string, unknown>>;
      } = {
        customer: authData,
        order_payment: paymentRow,
        order: [],
      };

      const created = await this.createOrdersFromGroupedCart({
        orderPayment: paymentRow,
        paymentType: data.paymentType,
        orderPaymentStatus: data.orderPaymentStatus,
        paymentMethod: data.paymentMethod,
        orderShipmentNote: data.orderShipmentNote,
        groupedCart,
        orderShipmentCourier,
        orderShipmentDelivery,
        customerAddr,
        shipmentAddress: this.buildShipmentAddress(customerAddr),
        adminFeePerMerchant: adminFee,
        // Catatan: pada kode Laravel `$promo_ecommerce` / `$promo_alias` / `$product_cart_notes`
        // tidak ikut di-scope ke fungsi ini, sehingga blok promo & note tidak pernah tereksekusi
        // pada jalur payment_method_request_v2 (dipertahankan agar perilaku identik).
        promo: null,
        promoAlias: null,
        productCartNotes: null,
        authData,
        totalShipmentForPromo: data.orderShipmentPackage,
        dataNotif,
      });

      if (!created.success) {
        return fail(created.message, created.errorCode);
      }

      await this.repo.deleteCustomerCarts(Number(authData.customer_id ?? 0));
      await this.sendOrderMail(orderPayment.oPaymentId);

      const lastOrder = created.lastOrder
        ? await this.repo.findLastOrderWithPayment(created.lastOrder.orderId)
        : null;

      const result: TransactionV3Result = {
        statusCode: HTTP_STATUS.OK,
        success: true,
        message: "Payment berhasil!",
        data: "Order berhasil, order anda sedang diproses.",
        payment: toSnakeCase(paymentRow),
        dataNotif: toSnakeCase(dataNotif),
        order: toSnakeCase(lastOrder),
      };

      if (withTutorial) {
        result.tutorial = tutorial;
      }

      return result;
    };

    if (bankName === "XFERS") {
      if (paymentGroup === "va") {
        const bank = data.paymentMethod.paymentMethodAlias.replace(/^va_/, "");
        const xfers = new XfersService();
        const biayaAdmin = adminFee;

        const param = {
          bankShortCode: bank,
          amount: Math.round(data.orderTotal) + Math.round(biayaAdmin),
          referenceId: orderPayment.oPaymentTrxId ?? "",
          displayName: `${String(authData.customer_name ?? "").slice(0, 2)}XXX`,
          model: "VA_Dynamic",
        };

        const response = await xfers.virtualAccount(param);

        if (!response.success) {
          return fail("Pembayaran gagal, silahkan coba beberapa saat lagi.");
        }

        const dataResponse = xfers.parseResponseInq(param.model, response.data) as
          | (Record<string, unknown> & {
              BankShortCode?: string;
              AccountNo?: string;
              ExpiredAt?: string;
            })
          | null;

        if (!dataResponse || Object.keys(dataResponse).length === 0) {
          return fail("Pembayaran gagal, silahkan coba beberapa saat lagi.");
        }

        const paymentUpdated = await this.repo.updateOrderPayment(orderPayment.oPaymentId, {
          oPaymentVaBank: dataResponse.BankShortCode ?? "",
          oPaymentVaNumber: dataResponse.AccountNo ?? "",
          oPaymentExpiredDate: dataResponse.ExpiredAt ? new Date(dataResponse.ExpiredAt) : null,
        });

        if (!paymentUpdated) {
          return fail(
            "Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!",
            "0003",
          );
        }

        const paymentRow: OrderPaymentRow = {
          ...orderPayment,
          oPaymentVaBank: dataResponse.BankShortCode ?? "",
          oPaymentVaNumber: dataResponse.AccountNo ?? "",
          oPaymentExpiredDate: dataResponse.ExpiredAt ? new Date(dataResponse.ExpiredAt) : null,
        };

        tutorial = this.loadTutorial("va", `${bank.toLowerCase()}_${bankName.toLowerCase()}`);

        return await finalize(paymentRow, true);
      }
    } else if (bankName === "Winpay") {
      if (paymentGroup === "qris") {
        const winpay = new WinPayService();
        const biayaAdmin = adminFee;
        const expiredTime = new Date(Date.now() + 3 * 60 * 60 * 1000);

        const param = {
          partnerRef: `ecommerce_${orderPayment.oPaymentTrxId ?? ""}`,
          nominal: Math.round(data.orderTotal) + Math.round(biayaAdmin),
          staticInfo: false,
          expiredTime: toISO8601String(expiredTime),
        };

        const response = await winpay.generateQris(param);
        const responseData = (response?.data ?? {}) as Record<string, any>;
        const responseCode = String(responseData?.responseCode ?? "");

        if (response && responseCode === "2004700") {
          const expiredRaw = responseData?.additionalInfo?.expiredAt;
          const expiredDate = expiredRaw ? new Date(expiredRaw) : null;

          const paymentUpdated = await this.repo.updateOrderPayment(orderPayment.oPaymentId, {
            oPaymentQrisUrl: responseData?.qrUrl ?? "",
            oPaymentExpiredDate: expiredDate,
          });

          if (!paymentUpdated) {
            return fail(
              "Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!",
              "0003",
            );
          }

          const paymentRow: OrderPaymentRow = {
            ...orderPayment,
            oPaymentQrisUrl: responseData?.qrUrl ?? "",
            oPaymentExpiredDate: expiredDate,
          };

          // Winpay tidak memuat tutorial pembayaran (mengikuti kode Laravel)
          return await finalize(paymentRow, false);
        }

        return fail(responseCode, "0003");
      }
    } else if (bankName === "Xendit") {
      if (paymentGroup === "retail") {
        const xendit = new XenditService();
        const biayaAdmin = adminFee;

        const xenditData = {
          name: String(authData.customer_name ?? ""),
          external_id: `ECOMMERCE_${data.paymentMethod.paymentMethod3rdparty.toUpperCase()}_${data.paymentMethod.paymentMethodAlias.toUpperCase()}_${Math.floor(Math.random() * 100000)}`,
          retail_outlet_name: data.paymentMethod.paymentMethodAlias.toUpperCase(),
          expected_amount: Number(orderPayment.oPaymentTotal ?? 0) + biayaAdmin,
        };

        const response = await xendit.retailCreatePayment(xenditData);
        const responseData = (response?.data ?? null) as Record<string, any> | null;

        if (!response || !response.ok || !responseData || "error_code" in responseData) {
          return fail("Pembayaran gagal. Silahkan ulangi beberapa saat lagi");
        }

        const paymentUpdated = await this.repo.updateOrderPayment(orderPayment.oPaymentId, {
          oPaymentRetailBank: responseData.retail_outlet_name ?? "",
          oPaymentRetailCode: responseData.payment_code ?? "",
          oPaymentRetailBankRefid: responseData.id ?? "",
          oPaymentExpiredDate: responseData.expiration_date
            ? new Date(responseData.expiration_date)
            : null,
        });

        if (!paymentUpdated) {
          return fail(
            "Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!",
            "0003",
          );
        }

        const paymentRow: OrderPaymentRow = {
          ...orderPayment,
          oPaymentRetailBank: responseData.retail_outlet_name ?? "",
          oPaymentRetailCode: responseData.payment_code ?? "",
          oPaymentRetailBankRefid: responseData.id ?? "",
          oPaymentExpiredDate: responseData.expiration_date
            ? new Date(responseData.expiration_date)
            : null,
        };

        tutorial = this.loadTutorial(
          "retail",
          `${data.paymentMethod.paymentMethodAlias.toLowerCase()}_${bankName.toLowerCase()}`,
        );

        return await finalize(paymentRow, true);
      }
    }

    return fail(
      "Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!",
      "0002",
    );
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

    if (flashSale === null || flashSale === undefined) {
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

    if (!merchant || merchant.merchantName === null || merchant.merchantName === undefined) {
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

  /**
   * Loop `foreach ($groupedCart ...)` yang ada di `transaction_v3` maupun
   * ketiga branch `payment_method_request_v2`: membuat order + order detail,
   * handle promo (cashback/ongkir), buy point, potong stok, dan notif merchant.
   * `adminFeePerMerchant === null` menandakan jalur non-3rdparty (tanpa admin fee).
   */
  private async createOrdersFromGroupedCart(params: {
    orderPayment: OrderPaymentRow;
    paymentType: string;
    orderPaymentStatus: string;
    paymentMethod: PaymentMethodData;
    orderShipmentNote: string;
    groupedCart: GroupedCheckoutCarts;
    orderShipmentCourier: readonly ShipmentCourierInput[];
    orderShipmentDelivery: readonly ShipmentDeliveryInput[];
    customerAddr: CustomerAddressWithCity;
    shipmentAddress: string;
    adminFeePerMerchant: number | null;
    promo: PromoTransactionData | null;
    promoAlias: string | null;
    productCartNotes: readonly ProductCartNoteInput[] | null;
    authData: TransactionAuthData;
    totalShipmentForPromo: number;
    dataNotif: {
      customer: TransactionAuthData;
      order_payment: OrderPaymentRow;
      order: Array<Record<string, unknown>>;
    };
  }): Promise<
    | { success: true; lastOrder: OrderRow | null }
    | { success: false; message: string; errorCode?: string }
  > {
    const {
      orderPayment,
      paymentType,
      orderPaymentStatus,
      paymentMethod,
      orderShipmentNote,
      groupedCart,
      orderShipmentCourier,
      orderShipmentDelivery,
      customerAddr,
      shipmentAddress,
      adminFeePerMerchant,
      promo,
      promoAlias,
      productCartNotes,
      authData,
      totalShipmentForPromo,
      dataNotif,
    } = params;

    const customerId = Number(authData.customer_id ?? 0);
    let indexOrder = 0;
    let lastOrder: OrderRow | null = null;

    for (const [merchantKey, cartItems] of Object.entries(groupedCart)) {
      const merchantId = Number(merchantKey);

      // sub_total per merchant
      const subTotalByMerchant = cartItems.reduce(
        (total, item) => total + Number(item.totalAmount ?? 0),
        0,
      );

      // order_shipment per merchant
      const shipment = this.resolveMerchantShipment(
        merchantKey,
        orderShipmentDelivery,
        orderShipmentCourier,
      );

      let orderShipmentPriceByMerchant = shipment.price;

      // handle promo ongkir di tabel order
      if (promo && promoAlias && promo.promoSection === "shipment") {
        const promoNominal = this.countPromoOngkirOrderAmount(
          promo,
          orderShipmentPriceByMerchant,
          groupedCart,
        );
        orderShipmentPriceByMerchant =
          orderShipmentPriceByMerchant - promoNominal < 0
            ? 0
            : orderShipmentPriceByMerchant - promoNominal;
      }

      const orderTotalByMerchant =
        adminFeePerMerchant === null
          ? subTotalByMerchant + orderShipmentPriceByMerchant
          : Math.round(subTotalByMerchant) +
            Math.round(orderShipmentPriceByMerchant) +
            Math.round(adminFeePerMerchant);

      const now = new Date();

      const orderRow = await this.repo.createOrder({
        orderNumber: await this.orderNumber(merchantId),
        oPaymentId: orderPayment.oPaymentId,
        customerId,
        merchantId,
        orderPaymentType: paymentType as never,
        driverId: 1,
        paymentMethodId: paymentMethod.paymentMethodId,
        paymentMethodGroup: paymentMethod.paymentMethodGroup,
        paymentMethodName: paymentMethod.paymentMethodName,
        paymentMethodDesc: paymentMethod.paymentMethodDesc,
        orderSubtotal: String(subTotalByMerchant),
        orderShipmentPrice: String(orderShipmentPriceByMerchant),
        orderShipmentType: (shipment.type || "driver") as never,
        orderShipmentCourier: shipment.courierName,
        orderShipmentPackage: shipment.packageName,
        orderShipmentTime: shipment.estimasi,
        orderTotal: String(orderTotalByMerchant),
        orderShipmentCost: "ebelanja" as never,
        orderShipmentDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        rCityId: customerAddr.rCityId,
        orderShipmentTo: customerAddr.cAddressName,
        orderShipmentAddress: shipmentAddress,
        orderShipmentNote,
        orderShipmentPhone: customerAddr.cAddressPhone,
        orderStatus: orderPaymentStatus as never,
        orderPaidDate: shipment.paidDate,
        orderCreateDate: now,
      });

      if (!orderRow) {
        return {
          success: false,
          message: "Order gagal, silahkan kontak Customer Service untuk informasi lebih lanjut!",
          errorCode: "0003",
        };
      }

      // handle promo cashback / ongkir → order_cashback + promo_used
      if (promoAlias) {
        const promoFresh = await this.repo.findPromoByAlias(promoAlias);

        if (promoFresh) {
          if (promoFresh.promoSection === "cashback") {
            const promoNominal = this.countPromoCbAmount(promoFresh as PromoCalculationInput, {
              oPaymentSubtotal: orderPayment.oPaymentSubtotal,
            });

            await this.repo.createOrderCashback({
              oPaymentId: orderPayment.oPaymentId,
              customerId,
              oCashbackNominal: String(promoNominal),
              oCashbackStatus: "new" as never,
              oCashbackUpdateDate: now,
              oCashbackCreateDate: now,
            });

            const promoUsed = await this.repo.createPromoUsed({
              promoId: promoFresh.promoId,
              customerId,
              orderId: orderRow.orderId,
              oPaymentId: orderPayment.oPaymentId,
              orderTotal: orderPayment.oPaymentSubtotal ?? "0",
              promoNominal: String(promoNominal),
              promoUsedStatus: "1" as never,
              promoUsedCreateDate: now,
            });

            if (promoUsed) {
              await this.repo.incrementPromoUsed(promoFresh.promoId);
            }
          } else if (promoFresh.promoSection === "shipment") {
            const promoNominal = this.countPromoOngkirOrderPaymentAmount(
              promoFresh as PromoCalculationInput,
              totalShipmentForPromo,
              groupedCart,
              orderShipmentDelivery,
              orderShipmentCourier,
            );
            const finalPromoNominal =
              totalShipmentForPromo - promoNominal < 0
                ? promoNominal - totalShipmentForPromo
                : promoNominal;

            const promoUsed = await this.repo.createPromoUsed({
              promoId: promoFresh.promoId,
              customerId,
              orderId: orderRow.orderId,
              oPaymentId: orderPayment.oPaymentId,
              orderTotal: orderPayment.oPaymentSubtotal ?? "0",
              promoNominal: String(finalPromoNominal),
              promoUsedStatus: "1" as never,
              promoUsedCreateDate: now,
            });

            if (promoUsed) {
              await this.repo.incrementPromoUsed(promoFresh.promoId);
            }
          }
        }
      }

      // order detail
      const notifOrder: Record<string, unknown> = {
        ...orderRow,
        order_detail: [] as unknown[],
      };
      let orderTotalHpp = 0;

      for (const cartItem of cartItems) {
        const product = cartItem.product;
        const ongoingFsDetail = product.ongoing_fs_detail as { fsDetailId: number } | null;
        const variant = (cartItem.variant ?? null) as { psOption?: string | null } | null;

        // note dari product_cart_notes
        let oDetailNote: string | null = null;

        if (productCartNotes && productCartNotes.length > 0) {
          let note = "";

          for (const item of productCartNotes) {
            if (Number(item.cart_id) === Number(cartItem.cartId)) {
              note = item.note ?? "";
            }
          }

          if (note !== "") {
            oDetailNote = note;
          }
        }

        const orderDetail = await this.repo.createOrderDetail({
          orderId: orderRow.orderId,
          productId: cartItem.productId,
          oDetailProductName: product.productName,
          oDetailProductImage: product.productImage1,
          oDetailProductPrice: String(cartItem.productPrice),
          oDetailProductHpp: String(cartItem.productPriceHpp),
          oDetailProductMargin: String(cartItem.productPrice - cartItem.productPriceHpp),
          oDetailSubtotalHpp: String(cartItem.productPriceHpp * cartItem.qty),
          oDetailSubtotalMargin: String(
            (cartItem.productPrice - cartItem.productPriceHpp) * cartItem.qty,
          ),
          oDetailProductWeight: Number(product.productWeight ?? 0) || 1000,
          oDetailSubtotal: String(cartItem.totalAmount),
          oDetailQty: cartItem.qty,
          psId: cartItem.psId,
          fsDetailId: ongoingFsDetail?.fsDetailId ?? 0,
          oDetailProductGrosir: cartItem.productGrosir as never,
          oDetailCreateDate: now,
          ...(oDetailNote ? { oDetailNote } : {}),
        });

        orderTotalHpp += cartItem.productPriceHpp * cartItem.qty;

        (notifOrder.order_detail as unknown[]).push(orderDetail);

        // buy point
        for (let x = 0; x < cartItem.qty; x++) {
          await this.productPointService.productPoint(cartItem.productId, "buy");
        }

        const productName = `${(product.productName ?? "").slice(0, 20)}... ${
          variant ? `(${variant.psOption ?? ""})` : ""
        }`;

        // mengurangi stock produk
        const productStockRow = await this.repo.findProductById(cartItem.productId);
        const newProductStock = Number(productStockRow?.productStock ?? 0) - cartItem.qty;

        if (newProductStock < 0) {
          return { success: false, message: `Stock ${productName}tidak mencukupi.` };
        }

        await this.repo.updateProductStock(cartItem.productId, newProductStock);

        const cartFsDetailId = Number(cartItem.fsDetailId ?? 0);

        if (cartFsDetailId !== 0) {
          const fsStockRow = await this.repo.findFlashSaleDetailById(cartFsDetailId);
          const newFsStock = Number(fsStockRow?.fsDetailProductStock ?? 0) - cartItem.qty;

          if (newFsStock < 0) {
            return {
              success: false,
              message: `Stock flash sale ${productName}tidak mencukupi.`,
            };
          }

          await this.repo.updateFlashSaleDetailStock(cartFsDetailId, newFsStock);
        } else {
          const psId = Number(cartItem.psId ?? 0);

          if (psId !== 0) {
            const psStockRow = await this.repo.findProductStockById(psId);
            const newPsStock = Number(psStockRow?.psStock ?? 0) - cartItem.qty;

            if (newPsStock < 0) {
              return { success: false, message: `Stock ${productName}tidak mencukupi.` };
            }

            await this.repo.updateVariantStock(psId, newPsStock);
          }
        }
      }

      notifOrder.order_total_hpp = orderTotalHpp;
      dataNotif.order[indexOrder] = notifOrder;

      // notif ke merchant (FCM topic cus-{id} & cus-lite-{id})
      const merchantCustomerId = (cartItems[0]?.merchant as { customerId?: number } | null)
        ?.customerId;

      if (merchantCustomerId) {
        await this.sendGcm(
          merchantCustomerId,
          "order-merchant",
          dataNotif,
          "Pesanan Baru",
          "ada pesanan baru, ketuk untuk melihat detail.",
        );
      }

      lastOrder = orderRow;
      indexOrder++;
    }

    return { success: true, lastOrder };
  }

  /** Data pengiriman per merchant (blok `//order_shipment` pada loop Laravel). */
  private resolveMerchantShipment(
    merchantKey: string,
    orderShipmentDelivery: readonly ShipmentDeliveryInput[],
    orderShipmentCourier: readonly ShipmentCourierInput[],
  ): {
    type: string;
    price: number;
    courierName: string;
    packageName: string;
    estimasi: string;
    paidDate: Date | null;
  } {
    const deliveryShipment = orderShipmentDelivery.find(
      (item) => String(item.merchant_id) === merchantKey,
    );

    if (deliveryShipment) {
      return {
        type: "driver",
        price: Number(deliveryShipment.item?.jumlah_pembayaran ?? 0),
        courierName: "Driver",
        packageName: "eBelenja Delivery",
        estimasi: "24 Jam",
        paidDate: null,
      };
    }

    const courierShipment = orderShipmentCourier.find(
      (item) => String(item.merchant_id) === merchantKey,
    );

    if (courierShipment) {
      return {
        type: "courier",
        price: Number(courierShipment.data_courier?.const?.value ?? 0),
        courierName: courierShipment.courier?.name ?? "",
        packageName: String(courierShipment.data_courier?.service ?? ""),
        estimasi: String(courierShipment.data_courier?.const?.etd ?? ""),
        paidDate: new Date(),
      };
    }

    // fallback mengikuti nilai default blok Laravel bila merchant tidak punya data kirim
    if (orderShipmentDelivery.length > 0) {
      return {
        type: "driver",
        price: 0,
        courierName: "Driver",
        packageName: "eBelenja Delivery",
        estimasi: "24 Jam",
        paidDate: null,
      };
    }

    return {
      type: "courier",
      price: 0,
      courierName: "",
      packageName: "",
      estimasi: "",
      paidDate: orderShipmentCourier.length > 0 ? new Date() : null,
    };
  }

  /** Gabungan alamat customer + kota (format `$address` pada controller Laravel). */
  private buildShipmentAddress(customerAddr: CustomerAddressWithCity): string {
    const city = customerAddr.city;

    return [
      customerAddr.cAddressAddress ?? "",
      city?.rCitySubdistrict ?? "",
      city?.rCityName ?? "",
      city?.rCityProvince ?? "",
      city?.rCityPostcode ?? "",
    ].join(", ");
  }

  /** Setara `date('Ymd')` (timezone Asia/Jakarta) untuk kode invoice `INV/Ymd`. */
  private jakartaDateCode(): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replace(/-/g, "");
  }

  /** Membaca file tutorial pembayaran (`storage/tutorial/{va|retail}/...json`). */
  private loadTutorial(kind: "va" | "retail", fileBase: string): unknown {
    try {
      const filePath = resolve(process.cwd(), "storage", "tutorial", kind, `${fileBase}.json`);
      return JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
  }

  /**
   * Migrasi `CartController::send_mail_order_v2` — email konfirmasi order
   * memakai template `orderMail` + normalisasi `toMailOrder`.
   */
  private async sendOrderMail(oPaymentId: number): Promise<void> {
    try {
      const orderPayment = await this.repo.findOrderPaymentForMail(oPaymentId);

      if (!orderPayment) return;

      const customerEmail = orderPayment.customer?.customerEmail;

      if (!customerEmail) return;

      const normalized = this.mailService.toMailOrder({
        ...orderPayment,
        oPaymentCreateDate: formatDate(orderPayment.oPaymentCreateDate),
      });

      const html = orderMail({
        order: normalized,
        urlAsset: "https://s3.belanjapasti.com",
      });

      const subject = `Pesanan #${orderPayment.oPaymentCode ?? "-"} | eBelanja.id`;

      await this.mailService.sendMail(customerEmail, subject, html);
    } catch (error) {
      pinoLogger.warn({ error }, "sendOrderMail gagal");
    }
  }
}
