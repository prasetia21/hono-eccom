import { createHash } from "node:crypto";
import { envSchema } from "@/config/env.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

export type JntConfig = {
  // order
  orderKey: string;
  orderApiKey: string;
  orderUsername: string;
  orderUrl: string;

  // tariff
  tariffKey: string;
  tariffUsername: string;
  tariffUrl: string;

  // track
  trackAuth: string;
  trackPass?: string;
  trackUsername: string;
  trackUrl: string;

  // cancel
  cancelKey: string;
  cancelApiKey: string;
  cancelUsername: string;
  cancelUrl: string;

  timeoutMs?: number;
};

function md5Hex(input: string) {
  return createHash("md5").update(input).digest("hex");
}

function base64OfMd5Hex(input: string) {
  const hex = md5Hex(input);
  return Buffer.from(hex, "utf8").toString("base64");
}

function safeJsonParse<T = any>(v: any): T | any {
  if (v === null) return v;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export class JntProvider {
  private config: JntConfig;

  constructor(config?: Partial<JntConfig>) {
    // ORDER
    const orderKey = config?.orderKey ?? envSchema.JNT_ORDER_KEY?.trim() ?? "";
    const orderApiKey = config?.orderApiKey ?? envSchema.JNT_ORDER_APIKEY?.trim() ?? "";
    const orderUsername = config?.orderUsername ?? envSchema.JNT_ORDER_USERNAME?.trim() ?? "";
    const orderUrl = config?.orderUrl ?? envSchema.JNT_ORDER_URL?.trim() ?? "";

    // TARIFF
    const tariffKey = config?.tariffKey ?? envSchema.JNT_TARIFF_KEY?.trim() ?? "";
    const tariffUsername = config?.tariffUsername ?? envSchema.JNT_TARIFF_USERNAME?.trim() ?? "";
    const tariffUrl = config?.tariffUrl ?? envSchema.JNT_TARIFF_URL?.trim() ?? "";

    // TRACK
    const trackAuth = config?.trackAuth ?? envSchema.JNT_TRACK_AUTH?.trim() ?? "";
    const trackUsername = config?.trackUsername ?? envSchema.JNT_TRACK_USERNAME?.trim() ?? "";
    const trackUrl = config?.trackUrl ?? envSchema.JNT_TRACK_URL?.trim() ?? "";

    // CANCEL
    const cancelKey = config?.cancelKey ?? envSchema.JNT_CANCEL_KEY?.trim() ?? "";
    const cancelApiKey = config?.cancelApiKey ?? envSchema.JNT_CANCEL_APIKEY?.trim() ?? "";
    const cancelUsername = config?.cancelUsername ?? envSchema.JNT_CANCEL_USERNAME?.trim() ?? "";
    const cancelUrl = config?.cancelUrl ?? envSchema.JNT_CANCEL_URL?.trim() ?? "";

    if (
      !orderKey ||
      !orderApiKey ||
      !orderUsername ||
      !orderUrl ||
      !tariffKey ||
      !tariffUsername ||
      !tariffUrl ||
      !trackAuth ||
      !trackUsername ||
      !trackUrl ||
      !cancelKey ||
      !cancelApiKey ||
      !cancelUsername ||
      !cancelUrl
    ) {
      throw new Error("JNT config error: Missing required configuration");
    }

    this.config = {
      orderKey,
      orderApiKey,
      orderUsername,
      orderUrl,
      tariffKey,
      tariffUsername,
      tariffUrl,
      trackAuth,
      trackUsername,
      trackUrl,
      cancelKey,
      cancelApiKey,
      cancelUsername,
      cancelUrl,
      timeoutMs: config?.timeoutMs ?? 0,
      trackPass: config?.trackPass ?? envSchema.JNT_TRACK_PASS?.trim(),
    };
  }

  private async sendRequest(
    url: string,
    params: any,
    method: "POST" | "GET" = "POST",
    contentType:
      | "application/x-www-form-urlencoded"
      | "application/json" = "application/x-www-form-urlencoded",
  ): Promise<any> {
    const isJson = contentType === "application/json";

    const res = await providerRequest<any>(url, {
      method,
      headers: {
        Accept: "application/json,text/plain,*/*",
        Authorization: `Basic ${this.config.trackAuth}`,
      },
      json: isJson ? (typeof params === "string" ? safeJsonParse(params) : params) : undefined,
      form: !isJson ? (typeof params === "object" ? params : undefined) : undefined,
      timeoutMs: this.config.timeoutMs || undefined,
    });

    return res.data;
  }

  async sendData(type: string, data: any) {
    switch (type) {
      case "order": {
        return await this.sendRequest(
          this.config.orderUrl,
          data,
          "POST",
          "application/x-www-form-urlencoded",
        );
      }
      case "track": {
        return await this.sendRequest(this.config.trackUrl, data, "POST", "application/json");
      }
      case "tariff": {
        return await this.sendRequest(
          this.config.tariffUrl,
          data,
          "POST",
          "application/x-www-form-urlencoded",
        );
      }
      case "cancel": {
        return await this.sendRequest(
          this.config.cancelUrl,
          data,
          "POST",
          "application/x-www-form-urlencoded",
        );
      }
      default:
        return null;
    }
  }

  request(type: string, params: any = {}) {
    const data: any = {};

    if (type === "tariff") {
      const p = {
        ...params,
        cusName: this.config.tariffUsername,
        productType: "EZ",
      };
      const json = JSON.stringify(p);
      data.data = json;
      data.sign = base64OfMd5Hex(json + this.config.tariffKey);
    } else if (type === "order") {
      const p = structuredClone(params);
      if (!Array.isArray(p.detail)) p.detail = [{}];
      if (!p.detail[0]) p.detail[0] = {};

      p.detail[0].username = this.config.orderUsername;
      p.detail[0].api_key = this.config.orderApiKey;
      p.detail[0].servicetype = "1";

      const json = JSON.stringify(p);
      data.data_param = json;
      data.data_sign = base64OfMd5Hex(json + this.config.orderKey);
    } else if (type === "track") {
      data.awb = params.awb;
      data.eccompanyid = this.config.trackUsername;
    } else if (type === "cancel") {
      const p = structuredClone(params);
      if (!Array.isArray(p.detail)) p.detail = [{}];
      if (!p.detail[0]) p.detail[0] = {};

      p.detail[0].username = this.config.cancelUsername;
      p.detail[0].api_key = this.config.cancelApiKey;

      const json = JSON.stringify(p);
      data.data_param = json;
      data.data_sign = base64OfMd5Hex(json + this.config.cancelKey);
    } else {
      return null;
    }

    return this.sendData(type, data);
  }

  parseResponse(opt: string = "", response: any = {}) {
    const recData: any = {};

    response = safeJsonParse(response);

    if (opt === "order") {
      recData.Success = response?.success;
      recData.Desc = response?.desc;
      recData.Detail = (Array.isArray(response?.detail) ? response.detail : []).map(
        (item: any) => ({
          Orderid: item.orderid,
          Status: item.status,
          Awb_no: item.awb_no,
          DesCode: item.desCode,
          Etd: item.etd,
        }),
      );
      return recData;
    }

    if (opt === "tariff") {
      const content = response?.content;
      const data = safeJsonParse(content);
      const arr = Array.isArray(data) ? data : [];

      return arr.map((item: any) => ({
        service: item.productType,
        description: item.name,
        cost: [
          {
            value: Number(item.cost ?? 0),
            minValue: Number(item.cost ?? 0),
            unitValue: Number(item.cost ?? 0),
            etd: "",
            note: "",
          },
        ],
      }));
    }

    if (opt === "track") {
      recData.Awb = response?.awb;
      recData.Orderid = response?.orderid;

      recData.Detail = {
        Shipped_date: response?.detail?.shipped_date,
        Services_code: response?.detail?.services_code,
        Services_type: response?.detail?.services_type,
        Actual_amount: response?.detail?.actual_amount,
        Weight: response?.detail?.weight,
        Qty: response?.detail?.qty,
        Itemname: response?.detail?.itemname ?? "",

        Detail_cost: {
          Shipping_cost: response?.detail?.detail_cost?.shipping_cost,
          Add_cost: response?.detail?.detail_cost?.add_cost,
          Insurance_cost: response?.detail?.detail_cost?.insurance_cost,
          Cod: response?.detail?.detail_cost?.cod,
          Return_cost: response?.detail?.detail_cost?.return_cost,
        },
        Sender: {
          Name: response?.detail?.sender?.name,
          Addr: response?.detail?.sender?.addr,
          Zipcode: response?.detail?.sender?.zipcode,
          City: response?.detail?.sender?.city,
          Geoloc: response?.detail?.sender?.geoloc,
        },
        Receiver: {
          Name: response?.detail?.receiver?.name,
          Addr: response?.detail?.receiver?.addr,
          Zipcode: response?.detail?.receiver?.zipcode,
          City: response?.detail?.receiver?.city,
          Geoloc: response?.detail?.receiver?.geoloc,
        },
        Driver: {
          Id: response?.detail?.driver?.id ?? "",
          Name: response?.detail?.driver?.name ?? "",
          Phone: response?.detail?.driver?.phone ?? "",
          Photo: response?.detail?.driver?.photo ?? "",
        },
        DelivDriver: {
          Id: response?.detail?.delivDriver?.id ?? "",
          Name: response?.detail?.delivDriver?.name ?? "",
          Phone: response?.detail?.delivDriver?.phone ?? "",
          Photo: response?.detail?.delivDriver?.photo ?? "",
        },
      };

      recData.History = (Array.isArray(response?.history) ? response.history : []).map(
        (item: any) => ({
          Date_time: item?.date_time ?? "",
          City_name: item?.city_name ?? "",
          Status: item?.status ?? "",
          Status_code: item?.status_code ?? "",
          StoreName: item?.storeName ?? "",
          NextSiteName: item?.nextSiteName ?? "",
          Note: item?.note ?? "",
          Receiver: item?.receiver ?? "",
          DriverName: item?.driverName ?? "",
          DriverPhone: item?.driverPhone ?? "",
          Presenter: item?.presenter ?? "",
          AgentName: item?.agentName ?? "",
          PresenterName: item?.presentername ?? "",
        }),
      );

      return recData;
    }

    if (opt === "cancel") {
      recData.Success = response?.success;
      recData.Desc = response?.desc;
      recData.Detail = (Array.isArray(response?.detail) ? response.detail : []).map(
        (item: any) => ({
          OrderId: item.orderid,
          Status: item.status,
          Reason: item.reason,
        }),
      );
      return recData;
    }

    return {};
  }
}
