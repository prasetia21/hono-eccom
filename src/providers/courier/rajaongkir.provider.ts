import { envSchema } from "@/config/env.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

export type RajaOngkirConfig = {
  baseUrl: string;
  apiKey: string;
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

function toQuery(obj: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    sp.append(k, String(v));
  }
  return sp.toString();
}

export class RajaOngkirService {
  private config: RajaOngkirConfig;

  constructor(config?: Partial<RajaOngkirConfig>) {
    const baseUrl = config?.baseUrl ?? envSchema.RAJAONGKIR_URL?.trim() ?? "";
    const apiKey = config?.apiKey ?? envSchema.RAJAONGKIR_KEY?.trim() ?? "";

    if (!baseUrl || !apiKey) {
      throw new Error("RajaOngkir config error: Missing required configuration");
    }

    this.config = {
      baseUrl,
      apiKey,
      timeoutMs: config?.timeoutMs ?? 30_000,
    };
  }

  private isKomerce(): boolean {
    return this.config.baseUrl.toLowerCase().includes("komerce.id");
  }

  private async requestJson(
    path: string,
    method: "GET" | "POST",
    query?: Record<string, any>,
    formBody?: Record<string, any>,
  ): Promise<any> {
    const qs = query ? toQuery(query) : "";
    const url = qs
      ? `${joinUrl(this.config.baseUrl, path)}?${qs}`
      : joinUrl(this.config.baseUrl, path);

    const res = await providerRequest<any>(url, {
      method,
      headers: {
        key: this.config.apiKey,
        Accept: "application/json",
      },
      form: method === "POST" ? formBody : undefined,
      timeoutMs: this.config.timeoutMs ?? 30_000,
    });

    if (!res.ok) {
      return {
        error: `cURL Error #: ${res.error ?? `HTTP ${res.status}`}`,
        status: res.status,
        details: res.data,
      };
    }

    return res.data;
  }

  roProvince(data?: { id?: string | number }) {
    const path = this.isKomerce() ? "destination/province" : "province";
    const query = data?.id ? { id: data.id } : undefined;
    return this.requestJson(path, "GET", query);
  }

  roCity(data: { city_id?: string | number; prov_id?: string | number }) {
    const path = this.isKomerce() ? "destination/city" : "city";
    const query: Record<string, any> = {};
    if (data.city_id) query.id = data.city_id;
    if (data.prov_id) query.province = data.prov_id;
    return this.requestJson(path, "GET", query);
  }

  roSubdistrict(data: { id: string | number }) {
    const path = this.isKomerce() ? "destination/district" : "subdistrict";
    return this.requestJson(path, "GET", { city: data.id });
  }

  roCostDist(data: {
    origin: string | number;
    originType: string;
    destination: string | number;
    destinationType: string;
    weight: string | number;
    courier: string;
  }) {
    const path = this.isKomerce() ? "calculate" : "cost";
    return this.requestJson(path, "POST", undefined, {
      origin: data.origin,
      originType: data.originType,
      destination: data.destination,
      destinationType: data.destinationType,
      weight: data.weight,
      courier: data.courier,
    });
  }

  roIntOrigin(data: { id: string | number; province: string | number }) {
    return this.requestJson("v2/internationalOrigin", "GET", {
      id: data.id,
      province: data.province,
    });
  }

  roIntDestination(data: { id: string | number }) {
    return this.requestJson("v2/internationalDestination", "GET", {
      id: data.id,
    });
  }

  roIntCost(data: {
    origin: string | number;
    destination: string | number;
    weight: string | number;
    courier: string;
  }) {
    return this.requestJson("v2/internationalCost", "POST", undefined, {
      origin: data.origin,
      destination: data.destination,
      weight: data.weight,
      courier: data.courier,
    });
  }

  roCurrency() {
    return this.requestJson("currency", "GET");
  }

  roWaybill(data: { waybill: string; courier: string }) {
    return this.requestJson("waybill", "POST", undefined, {
      waybill: data.waybill,
      courier: data.courier,
    });
  }
}
