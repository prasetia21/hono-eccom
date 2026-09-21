import { eq } from "drizzle-orm";
import { settingTable } from "@/db/schema";
import { db } from "@/libs/postgresql.ts";
import { cacheGetOrSet } from "@/libs/redis.ts";
import { MailjetProvider } from "@/providers/email/jetmail.provider.ts";
import { SendgridProvider } from "@/providers/email/sendgrid.provider.ts";
import { SendinblueProvider } from "@/providers/email/sendinblue.provider.ts";
import type { MailV2Order } from "@/providers/email/template/order-mail.ts";
import type { MailProvider, SendMailResult } from "@/providers/email/service/type.ts";
import { envSchema } from "@/config/env.ts";

type Vendor = "sendgrid" | "sendinblue" | "mailjet";

type SendMailConfig = {
  defaultFromName?: string;
  defaultFromEmail?: string;
  defaultVendor?: Vendor;
  cachePrefix?: string;
  cacheOptions?: any;
};

type ResolveMailConfig = {
  defaultFromName: string;
  defaultFromEmail: string;
  defaultVendor: Vendor;
  cachePrefix?: string;
  cacheOptions?: any;
};

function serializeError(err: any) {
  return {
    name: err?.name,
    message: err?.message ?? String(err),
    stack: err?.stack,
  };
}

export class SendMailService {
  private keys = {
    sendgridKey: envSchema.SENDGRID_API_KEY?.trim() ?? "",
    sendinblueKey: envSchema.SENDINBLUE_API_KEY?.trim() ?? "",
    mailjetPublic: envSchema.MAILJET_PUBLIC_KEY?.trim() ?? "",
    mailjetPrivate: envSchema.MAILJET_PRIVATE_KEY?.trim() ?? "",
  };

  private config: ResolveMailConfig;
  constructor(config: SendMailConfig = {}) {
    this.config = {
      defaultFromName: config.defaultFromName ?? "Belanja Pasti",
      defaultFromEmail: config.defaultFromEmail ?? "noreply@belanjapasti.com",
      defaultVendor: config.defaultVendor ?? "mailjet",
      cachePrefix: config.cachePrefix,
      cacheOptions: config.cacheOptions,
    };
  }

  private normalizeVendor(v: unknown): Vendor | null {
    const x = String(v ?? "")
      .toLowerCase()
      .trim();
    if (x === "sendgrid" || x === "sendinblue" || x === "mailjet") return x;
    return null;
  }

  private providerFactory(vendor: Vendor): MailProvider {
    const fromName = this.config.defaultFromName;
    const fromEmail = this.config.defaultFromEmail;

    switch (vendor) {
      case "sendgrid": {
        if (!this.keys.sendgridKey) throw new Error("SENDGRID_API_KEY belum di-set");
        return new SendgridProvider({
          fromName,
          fromEmail,
          apiKey: this.keys.sendgridKey,
        });
      }

      case "sendinblue": {
        if (!this.keys.sendinblueKey) throw new Error("SENDINBLUE_API_KEY belum di-set");
        return new SendinblueProvider({
          fromName,
          fromEmail,
          apiKey: this.keys.sendinblueKey,
        });
      }

      case "mailjet":
      default: {
        if (!this.keys.mailjetPublic || !this.keys.mailjetPrivate) {
          throw new Error("MAILJET_PUBLIC_KEY/MAILJET_PRIVATE_KEY belum di-set");
        }
        return new MailjetProvider({
          fromName,
          fromEmail,
          publicKey: this.keys.mailjetPublic,
          privateKey: this.keys.mailjetPrivate,
        });
      }
    }
  }

  private async getSettingByTypeCached(type: string): Promise<Record<string, string>> {
    const cacheKey = `setting:type:${type}`;

    return await cacheGetOrSet<Record<string, string>>(
      cacheKey,
      async () => {
        const rows = await db.select().from(settingTable).where(eq(settingTable.settingType, type));

        const result: Record<string, string> = {};
        for (const r of rows) {
          if (r.settingName) result[r.settingName] = String(r.settingValue ?? "");
        }
        return result;
      },
      {
        prefix: this.config.cachePrefix,
        ...this.config.cacheOptions,
      },
    );
  }

  async sendMail(to: string, subject: string, html: string): Promise<SendMailResult> {
    let vendor: Vendor = this.config.defaultVendor;

    try {
      const mailSetting = await this.getSettingByTypeCached("email");
      const vendorFromDb = this.normalizeVendor(mailSetting["vendor"]);
      vendor = vendorFromDb ?? this.config.defaultVendor ?? "mailjet";

      const provider = this.providerFactory(vendor);
      return await provider.sendMail(to, subject, html);
    } catch (err: any) {
      return {
        success: false,
        message: err?.message ?? "Error",
        data: serializeError(err),
      };
    }
  }

  toMailOrder(normalized: any): MailV2Order {
    const n = normalized ?? {};
    const o = n.order ?? {};

    const detailsSrc = o.order_detail ?? o.order_details ?? [];

    const merchant = o.merchant ?? {};
    const addr = merchant.address_primary ?? {};
    const city = addr.city ?? {};

    return {
      o_payment_code: n.oPaymentCode,
      o_payment_name: n.oPaymentName,
      o_payment_total: n.oPaymentTotal,
      o_payment_subtotal: n.oPaymentSubtotal,
      o_payment_service: n.oPaymentService,
      o_payment_admin_fee: n.oPaymentAdminFee,
      o_payment_create_date: n.oPaymentCreateDate,

      customer: {
        customer_name: n.customer?.customerName ?? o.customer?.customerName,
        customer_msisdn: n.customer?.customerMsisdn ?? o.customer?.customerMsisdn,
      },

      whitelabel: n.customer?.whitelabel
        ? {
            c_whitelabel_logo: n.customer.whitelabel.cWhitelabelLogo,
            c_whitelabel_facebook: n.customer.whitelabel.cWhitelabelFacebook,
            c_whitelabel_youtube: n.customer.whitelabel.cWhitelabelYoutube,
            c_whitelabel_twitter: n.customer.whitelabel.cWhitelabelTwitter,
            c_whitelabel_instagram: n.customer.whitelabel.cWhitelabelInstagram,
          }
        : null,

      order: [
        {
          order_number: o.orderNumber,
          order_shipment_address: o.orderShipmentAddress,

          merchant: {
            merchant_name: merchant.merchantName,
            address_primary: {
              c_address_address: addr.cAddressAddress,
              city: {
                r_city_subdistrict: city.rCitySubdistrict,
                r_city_name: city.rCityName,
                r_city_province: city.rCityProvince,
                r_city_postcode: city.rCityPostcode,
              },
            },
          },

          order_detail: (detailsSrc ?? []).map((d: any) => ({
            o_detail_product_image: d.oDetailProductImage,
            o_detail_product_name: d.oDetailProductName,
            o_detail_qty: d.oDetailQty,
            o_detail_product_price: d.oDetailProductPrice,
            o_detail_subtotal: d.oDetailSubtotal,
          })),
        },
      ],
    };
  }
}
