import { envSchema } from "@/config/env.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

export type AnterajaConfig = {
  baseUrl: string;
  accessKey: string;
  secretKey: string;
  prefix: string;
  timeoutMs?: number;
};

function trimSlashEnd(s: string) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function trimSlashStart(s: string) {
  return s.startsWith("/") ? s.slice(1) : s;
}

function joinUrl(baseUrl: string, path: string) {
  return `${trimSlashEnd(baseUrl)}/${trimSlashStart(path)}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYmdHis(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

type AnterajaHistoryItem = {
  timestamp: string;
  message: any;
};

export interface AnterajaApiResponse {
  content?: {
    services?: Array<any>;
    waybill_no?: string;
    expect_start?: string;
    expect_finish?: string;
    reverse_waybill?: string;
    reverse_product?: string;
    timezone?: string;
    info?: string;
    content?: string;
  };
  history?: AnterajaHistoryItem[];
  order?: {
    service_code?: string;
    weight?: string | number;
    shipper?: { name?: string; address?: string };
    receiver?: { name?: string; address?: string };
  };
  waybill_no?: string;
  insurance_fee?: string | number;
  [k: string]: any;
}

export class AnterajaProvider {
  private config: AnterajaConfig;

  constructor(config?: Partial<AnterajaConfig>) {
    const baseUrl = config?.baseUrl ?? envSchema.ANTERAJA_URL?.trim() ?? "";
    const accessKey = config?.accessKey ?? envSchema.ANTERAJA_ACCESS_KEY?.trim() ?? "";
    const secretKey = config?.secretKey ?? envSchema.ANTERAJA_SECRET_KEY?.trim() ?? "";
    const prefix = config?.prefix ?? envSchema.ANTERAJA_PREFIX_KEY?.trim() ?? "";

    if (!baseUrl || !accessKey || !secretKey || !prefix) {
      throw new Error("Anteraja config error: Missing required configuration");
    }

    this.config = {
      baseUrl,
      accessKey,
      secretKey,
      prefix,
      timeoutMs: config?.timeoutMs ?? 0,
    };
  }

  private async sendRequest<T = any>(
    path: string,
    method: "POST" | "GET" = "POST",
    params?: unknown,
  ): Promise<T | null> {
    const url = joinUrl(this.config.baseUrl, path);

    const res = await providerRequest<T>(url, {
      method,
      headers: {
        "access-key-id": this.config.accessKey,
        "secret-access-key": this.config.secretKey,
      },
      json: method === "POST" ? (params ?? {}) : undefined,
      timeoutMs: this.config.timeoutMs || undefined,
    });

    return res.data;
  }

  sendData(type: string, data: any) {
    let path = "";
    let method: "POST" | "GET" = "POST";

    switch (type) {
      case "service":
        path = "/serviceRates";
        method = "POST";
        break;
      case "order":
        path = "/order";
        method = "POST";
        break;
      case "pickup":
        path = "/requestPickup";
        method = "POST";
        break;
      case "tracking":
        path = "/tracking";
        method = "POST";
        break;
      case "insurance":
        path = "/insurance";
        method = "POST";
        break;
      case "cancel":
        path = "/cancelOrder";
        method = "POST";
        break;
      default:
        return null;
    }

    return this.sendRequest(path, method, data);
  }

  request(type: string, params: any = {}) {
    const data: any = {};

    if (type === "service") {
      data.origin = params.origin;
      data.destination = params.destination;
      data.weight = params.weight;
    } else if (type === "order") {
      data.booking_id = `${this.config.prefix}-${params.booking_id}`;
      data.invoice_no = params.invoice_no;
      data.service_code = params.service_code;
      data.parcel_total_weight = params.parcel_total_weight;

      data.shipper = {
        name: params.name_shipper,
        phone: params.phone_shipper,
        email: params.email_shipper,
        district: params.district_shipper,
        address: params.address_shipper,
        postcode: params.postcode_shipper,
        geoloc: params.geoloc_shipper,
      };

      data.receiver = {
        name: params.name_receiver,
        phone: params.phone_receiver,
        email: params.email_receiver,
        district: params.district_receiver,
        address: params.address_receiver,
        postcode: params.postcode_receiver,
        geoloc: params.geoloc_receiver,
      };

      if (Array.isArray(params.item) && params.item.length > 0) {
        data.items = params.item.map((item: any) => ({
          item_name: item.o_detail_product_name,
          item_desc: String(item.o_detail_product_name ?? "").substring(0, 30),
          item_category: "",
          item_quantity: item.o_detail_qty,
          declared_value: item.o_detail_product_price,
          weight: item.o_detail_product_weight < 100 ? 100 : item.o_detail_product_weight,
        }));
      } else {
        data.items = [];
      }

      data.use_insurance = false;
      data.declared_value = params.declared_value;
      data.expect_time = formatYmdHis(new Date());
    } else if (type === "pickup") {
      data.waybill_no = params.waybill_no;
      data.expect_time = formatYmdHis(new Date());
    } else if (type === "tracking") {
      data.waybill_no = params.waybill_no;
    } else if (type === "insurance") {
      data.declared_value = params.declared_value;
      data.item_category = params.item_category;
    } else if (type === "cancel") {
      data.waybill_no = params.waybill_no;
    }

    return this.sendData(type, data);
  }

  parseResponse(opt: string = "", response: AnterajaApiResponse = {}) {
    const recData: any = {};

    if (opt === "service") {
      const services = response?.content?.services ?? [];
      return services.map((item: any) => ({
        service: item.product_code,
        description: item.product_name,
        cost: [
          {
            value: item.rates,
            minValue: item.rates,
            unitValue: item.rates,
            etd: item.etd,
            note: "",
          },
        ],
      }));
    }

    if (opt === "order") {
      recData.WaybillNo = response?.content?.waybill_no;
      recData.ExpectStart = response?.content?.expect_start;
      recData.ExpectFinish = response?.content?.expect_finish;
      recData.ReverseWaybill = response?.content?.reverse_waybill;
      recData.ReverseProduct = response?.content?.reverse_product;
      return recData;
    }

    if (opt === "pickup") {
      recData.ExpectStart = response?.content?.expect_start;
      recData.ExpectFinish = response?.content?.expect_finish;
      recData.ReverseWaybill = response?.content?.reverse_waybill;
      recData.ReverseProduct = response?.content?.reverse_product;
      recData.Timezone = response?.content?.timezone;
      return recData;
    }

    if (opt === "tracking") {
      const order = response.order ?? {};
      const shipper = order.shipper ?? {};
      const receiver = order.receiver ?? {};

      recData.Waybill_number = response.waybill_no;
      recData.Kodeasal = "";
      recData.Kodetujuan = "";
      recData.Service = order.service_code;
      recData.Weight = order.weight;
      recData.Sender = shipper.name;
      recData.Sender_address = shipper.address;
      recData.Receiver_address = receiver.address;
      recData.Receiver_name = receiver.name;
      recData.Realprice = "";
      recData.Totalprice = "";
      recData.POD_receiver = "";
      recData.POD_receiver_time = "";
      recData.Send_date = "";

      const history = response.history ?? [];
      recData.track_history = history.map((h: any) => {
        const ts = h?.timestamp ? new Date(h.timestamp) : new Date();
        const msg = h?.message;
        const city =
          (msg && typeof msg === "object" && "id" in msg ? msg.id : undefined) ??
          (typeof msg === "string" ? msg : "");

        return {
          Date_time: formatYmdHis(ts),
          Status: "",
          City: city,
        };
      });

      return recData;
    }

    if (opt === "insurance") {
      recData.InsuranceFee = response.insurance_fee;
      return recData;
    }

    if (opt === "cancel") {
      recData.Info = response?.content?.info;
      recData.content = response?.content?.content;
      return recData;
    }

    return recData;
  }

  parseInquiry(model: string, response: any, parm: any = {}) {
    const param: any[] = [];

    if (response?.AdminCharge !== null && parm?.AdminCharge !== null) {
      response.AdminCharge = Number(response.AdminCharge) + Number(parm.AdminCharge);
    }

    if (model === "pdam") {
      let periode = "";

      const billDetail = Array.isArray(response?.BillDetail) ? response.BillDetail : [];
      billDetail.forEach((data: any, idx: number) => {
        if (idx !== 0) periode += ", ";
        const raw = Array.isArray(data?.bill_date)
          ? String(data.bill_date[0] ?? "")
          : String(data?.bill_date ?? "");

        const a = raw.substring(0, 4);
        const b = raw.substring(4, 8);
        periode += `${b}-${a}`;
      });

      param.push({
        label: "NO PELANGGAN",
        type: "string",
        value: response?.CustomerNumber1,
      });
      param.push({
        label: "NAMA",
        type: "string",
        value: response?.SubscriberName,
      });
      param.push({ label: "PERIODE", type: "string", value: periode });
      param.push({
        label: "TAGIHAN",
        type: "rupiah",
        value: response?.Nominal,
      });
      param.push({ label: "ADMIN", type: "rupiah", value: parm?.AdminCharge });
      param.push({
        label: "TOTAL TAGIHAN",
        type: "rupiah",
        value: Number(response?.Nominal ?? 0) + Number(parm?.AdminCharge ?? 0),
      });
    }

    return param;
  }
}
