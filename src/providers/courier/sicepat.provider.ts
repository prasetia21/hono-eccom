import { envSchema } from "@/config/env.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

export type SicepatConfig = {
  baseUrl1: string;
  baseUrl2: string;
  apiKey: string;
  authKey: string;
};

interface SicepatParseResponse {
  sicepat: {
    results?: Array<any>;
    result?: {
      waybill_number?: string;
      kodeasal?: string;
      kodetujuan?: string;
      service?: string;
      weight?: number;
      sender?: string;
      sender_address?: string;
      receiver_address?: string;
      receiver_name?: string;
      realprice?: number;
      totalprice?: number;
      POD_receiver?: string;
      POD_receiver_time?: string;
      send_date?: string;
      perwakilan?: string;
      track_history?: Array<{
        date_time: string;
        status: string;
        city?: string;
        receiver_name?: string;
      }>;
      last_status?: {
        date_time: string;
        status: string;
        receiver_name?: string;
      };
    };
  };
  datas?: Array<{
    cust_package_id: string;
    receipt_number: string;
  }>;
  request_number?: string;
  receipt_datetime?: string;
  message?: string;
}

function parseBaseUrl(url: string) {
  return url.endsWith("/") ? url : url + "/";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYmdHi(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function toQueryParams(obj: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === undefined || v === null) continue;
    sp.append(k, String(v));
  }
  return sp.toString();
}

export class SicepatProvider {
  private config: SicepatConfig;

  constructor(_config?: Partial<SicepatConfig>) {
    const baseUrl1 = _config?.baseUrl1 ?? envSchema.SICEPAT_URL1?.trim() ?? "";
    const baseUrl2 = _config?.baseUrl2 ?? envSchema.SICEPAT_URL2?.trim() ?? "";
    const apiKey = _config?.apiKey ?? envSchema.SICEPAT_API_KEY?.trim() ?? "";
    const authKey = _config?.authKey ?? envSchema.SICEPAT_AUTH_KEY?.trim() ?? "";

    if (!baseUrl1 || !baseUrl2 || !apiKey || !authKey) {
      throw new Error("Sicepat config error: Missing required configuration");
    }

    this.config = {
      apiKey,
      authKey,
      baseUrl1: parseBaseUrl(baseUrl1),
      baseUrl2: parseBaseUrl(baseUrl2),
    };
  }

  private async sendRequest<T = any>(
    url: string,
    method: "GET" | "POST" = "POST",
    body?: unknown,
  ): Promise<T | null> {
    let finalUrl = url;

    if (method === "GET") {
      const params = (body ?? {}) as Record<string, any>;
      const qs = toQueryParams(params);
      if (qs) finalUrl = url + (url.includes("?") ? "&" : "?") + qs;
    }

    const payload =
      method === "POST"
        ? {
            auth_key: this.config.authKey,
            ...((body ?? {}) as Record<string, any>),
          }
        : undefined;

    const res = await providerRequest<T>(finalUrl, {
      method,
      headers: {
        "api-key": this.config.apiKey,
      },
      json: payload,
    });

    return res.data;
  }

  sendData(type: string, data: any) {
    const config: any = {};

    switch (type) {
      case "tarif":
        config.url = this.config.baseUrl1 + "tariff";
        config.method = "GET";
        break;
      case "waybill":
        config.url = this.config.baseUrl1 + "waybill";
        config.method = "GET";
        break;
      case "pickup":
        config.url = this.config.baseUrl2 + "requestpickuppackage";
        config.method = "POST";
        break;
      case "cancel":
        config.url = this.config.baseUrl2 + "cancelpickup";
        config.method = "POST";
        break;
      case "waybillNumber":
        config.url = "/waybillNumber";
        config.method = "GET";
        break;
      case "refno":
        config.url = this.config.baseUrl1 + "waybill-refno";
        config.method = "GET";
        break;
      default:
        return null as any;
    }

    return this.sendRequest(config.url, config.method, data);
  }

  request(type: string, params: any = {}) {
    const data: any = {};

    if (type === "tarif") {
      data.origin = params.origin;
      data.destination = params.destination;
      data.weight = params.weight;
    } else if (type === "waybill") {
      data.waybill = params.waybill;
    } else if (type === "pickup") {
      data.reference_number = params.reference_number;
      data.pickup_request_date = formatYmdHi(new Date());
      data.pickup_method = "PICKUP";
      data.pickup_merchant_name = params.pickup_merchant_name;
      data.pickup_merchant_code = "";
      data.pickup_address = params.pickup_address;
      data.pickup_city = params.pickup_city;
      data.pickup_merchant_phone = params.pickup_merchant_phone;
      data.pickup_merchant_email = params.pickup_merchant_email;
      data.voucher_code = params.voucher_code;

      data.PackageList = [
        {
          receipt_number: params.receipt_number,
          origin_code: params.origin_code,
          delivery_type: params.delivery_type,
          parcel_category: params.parcel_category,
          parcel_content: params.parcel_content,
          parcel_qty: params.parcel_qty,
          parcel_uom: params.parcel_uom,
          parcel_value: params.parcel_value,
          total_weight: params.total_weight,
          shipper_name: params.shipper_name,
          shipper_address: params.shipper_address,
          shipper_province: params.shipper_province,
          shipper_city: params.shipper_city,
          shipper_district: params.shipper_district,
          shipper_zip: params.shipper_zip,
          shipper_phone: params.shipper_phone,
          shipper_longitude: params.shipper_longitude,
          shipper_latitude: params.shipper_latitude,
          recipient_title: params.recipient_title,
          recipient_name: params.recipient_name,
          recipient_address: params.recipient_address,
          recipient_province: params.recipient_province,
          recipient_city: params.recipient_city,
          recipient_district: params.recipient_district,
          recipient_zip: params.recipient_zip,
          recipient_phone: params.recipient_phone,
          recipient_longitude: params.recipient_longitude,
          recipient_latitude: params.recipient_latitude,
          destination_code: params.destination_code,
        },
      ];
    } else if (type === "cancel") {
      data.receipt_number = params.receipt_number;
    } else if (type === "number") {
      data.orderId = params.orderId;
    } else if (type === "refno") {
      data.waybill = params.waybill;
    }

    return this.sendData(type, data);
  }

  parseResponse(opt: string = "", response: SicepatParseResponse) {
    const data: any = {};

    if (opt === "tarif") {
      const results = response.sicepat.results || [];
      return results.map((item) => ({
        service: item.service,
        description: item.description,
        cost: [
          {
            value: item.tariff,
            minValue: item.minPrice,
            unitValue: item.unitPrice,
            etd: item.etd,
            note: "",
          },
        ],
      }));
    }

    if (opt === "pickup") {
      const out: any[] & Record<string, any> = [] as any;
      out["Request_number"] = response.request_number;
      out["Receipt_datetime"] = response.receipt_datetime;

      const datas = response.datas || [];
      for (const item of datas) {
        out.push([
          {
            Cust_package_id: item.cust_package_id,
            Receipt_number: item.receipt_number,
          },
        ]);
      }
      return out;
    }

    if (opt === "cancel") {
      data["Request_number"] = response.request_number;
      data["Message"] = response.message;
      return data;
    }

    if (opt === "waybill") {
      const res = response.sicepat.result || {};

      data["Waybill_number"] = res.waybill_number;
      data["Kodeasal"] = res.kodeasal;
      data["Kodetujuan"] = res.kodetujuan;
      data["Service"] = res.service;
      data["Weight"] = res.weight;
      data["Sender"] = res.sender;
      data["Sender_address"] = res.sender_address;
      data["Receiver_address"] = res.receiver_address;
      data["Receiver_name"] = res.receiver_name;
      data["Realprice"] = res.realprice;
      data["Totalprice"] = res.totalprice;
      data["POD_receiver"] = res.POD_receiver;
      data["POD_receiver_time"] = res.POD_receiver_time;
      data["Send_date"] = res.send_date;

      const trackHistory = res.track_history || [];
      if (trackHistory.length) {
        data["track_history"] = trackHistory.map((item) => ({
          Date_time: item.date_time,
          Status: item.status,
          City: item.city ?? item.receiver_name,
        }));

        data["Last_status"] = {
          Date_time: res.last_status?.date_time,
          Status: res.last_status?.status,
          Receiver_name: "",
          City: "",
        };
        data["Perwakilan"] = res.perwakilan;
      }

      return data;
    }

    if (opt === "refno") {
      const res = response.sicepat.result || {};

      data["Waybill_number"] = res.waybill_number;
      data["Kodeasal"] = res.kodeasal;
      data["Kodetujuan"] = res.kodetujuan;
      data["Service"] = res.service;
      data["Weight"] = res.weight;
      data["Sender"] = res.sender;
      data["Sender_address"] = res.sender_address;
      data["Receiver_address"] = res.receiver_address;
      data["Receiver_name"] = res.receiver_name;
      data["Realprice"] = res.realprice;
      data["Totalprice"] = res.totalprice;
      data["POD_receiver"] = res.POD_receiver;
      data["POD_receiver_time"] = res.POD_receiver_time;
      data["Send_date"] = res.send_date;

      const trackHistory = res.track_history || [];
      if (trackHistory.length) {
        data["track_history"] = trackHistory.map((item) => ({
          Date_time: item.date_time,
          Status: item.status,
          City: item.city ?? item.receiver_name,
        }));

        data["Last_status"] = {
          Date_time: res.last_status?.date_time,
          Status: res.last_status?.status,
          Receiver_name: res.last_status?.receiver_name,
        };
        data["Perwakilan"] = res.perwakilan;
      }

      return data;
    }

    return data;
  }
}
