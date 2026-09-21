import { envSchema } from "@/config/env.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

type ApiVersion = "v1" | "v2";

export type XenditConfig = {
  secretKey: string;
  prefix: string;
  callbackToken: string;
  baseUrl: string;
};

export type XenditResponse<T = unknown> = {
  ok: boolean;
  status: number;
  data: T;
};

function parseBaseUrl(url: string) {
  return url.endsWith("/") ? url : url + "/";
}

export class XenditService {
  private config: XenditConfig;

  constructor(config?: Partial<XenditConfig>) {
    const secretKey = config?.secretKey ?? envSchema.XENDIT_SECRET_KEY?.trim() ?? "";
    const prefix = config?.prefix ?? envSchema.XENDIT_PREFIX?.trim() ?? "";
    const callbackToken = config?.callbackToken ?? envSchema.XENDIT_CALLBACK_TOKEN?.trim() ?? "";
    const rawBaseUrl = config?.baseUrl ?? envSchema.XENDIT_URL?.trim() ?? "";

    if (!secretKey || !prefix || !callbackToken || !rawBaseUrl) {
      throw new Error("Xendit config error: Missing required configuration");
    }

    const { baseUrl: _baseUrlOverride, ...restConfig } = config ?? {};

    this.config = {
      secretKey,
      prefix,
      callbackToken,
      baseUrl: parseBaseUrl(rawBaseUrl),
      ...restConfig,
    };
  }

  private async request<T = unknown>(opt: {
    path: string;
    method?: "GET" | "POST";
    body?: unknown;
    apiVersion?: ApiVersion;
    idempotencyKey?: string;
  }): Promise<XenditResponse<T>> {
    const url = `${this.config.baseUrl}${opt.path.startsWith("/") ? "" : "/"}${opt.path}`;
    const method = opt.method ?? "POST";

    const headers: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
    };

    if (opt.apiVersion === "v2") {
      headers["api-version"] = "2022-07-31";
    }

    if (opt.idempotencyKey) {
      headers["X-IDEMPOTENCY-KEY"] = opt.idempotencyKey;
    }

    const res = await providerRequest<T>(url, {
      method,
      basicAuth: {
        username: this.config.secretKey,
        password: "password",
      },
      headers,
      json: method === "GET" ? undefined : (opt.body ?? {}),
    });

    return {
      ok: res.ok,
      status: res.status,
      data: res.data as T,
    };
  }

  // Retail - Create Payment
  retailCreatePayment(data: {
    external_id: string;
    retail_outlet_name: string;
    name: string;
    expected_amount: number;
  }) {
    const expiration_date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return this.request({
      path: "/fixed_payment_code",
      apiVersion: "v1",
      body: {
        external_id: data.external_id,
        retail_outlet_name: data.retail_outlet_name,
        name: data.name,
        expected_amount: data.expected_amount,
        prefix: this.config.prefix,
        expiration_date,
      },
    });
  }

  RetailCreatePayment(data: {
    external_id: string;
    retail_outlet_name: string;
    name: string;
    expected_amount: number;
  }) {
    return this.retailCreatePayment(data);
  }

  // QRIS - Create Payment (v2)
  qrisCreatePayment(data: { reference_id: string; metadata: Record<string, unknown> }) {
    return this.request({
      path: "/qr_codes",
      apiVersion: "v2",
      body: {
        reference_id: data.reference_id,
        type: "STATIC",
        currency: "IDR",
        metadata: data.metadata,
      },
    });
  }

  // Retail - Get Fixed Payment Code
  retailGetFixedPayment(data: { fixed_payment_code_id: string }) {
    return this.request({
      path: `/fixed_payment_code/${encodeURIComponent(data.fixed_payment_code_id)}`,
      method: "GET",
      apiVersion: "v1",
    });
  }

  // VA - Get Bank
  vaGetBank() {
    return this.request({
      path: "/available_virtual_account_banks",
      method: "GET",
      apiVersion: "v1",
    });
  }

  // VA - Create Fixed
  vaCreateFixed(data: { bank_code: string; name: string }) {
    const external_id = `eBelanja_Disb_${data.bank_code}`;

    return this.request({
      path: "/callback_virtual_accounts",
      apiVersion: "v1",
      body: {
        external_id,
        bank_code: data.bank_code,
        name: data.name,
      },
    });
  }

  // VA - Get Fixed
  vaGetFixed(data: { id: string }) {
    return this.request({
      path: `/callback_virtual_accounts/${encodeURIComponent(data.id)}`,
      method: "GET",
      apiVersion: "v1",
    });
  }

  // VA - Get Fixed Payment
  vaGetFixedPayment(data: { payment_id: string }) {
    return this.request({
      path: `/callback_virtual_account_payments/${encodeURIComponent(data.payment_id)}`,
      method: "GET",
      apiVersion: "v1",
    });
  }

  // Disbursement - Get Bank
  disbursementGetBank() {
    return this.request({
      path: "/available_disbursements_banks",
      method: "GET",
      apiVersion: "v1",
    });
  }

  // DisbursementGetCodeBank
  async disbursementGetCodeBank(): Promise<XenditResponse<string>> {
    const res = await this.disbursementGetBank();
    const arr = Array.isArray(res.data) ? (res.data as any[]) : [];
    const codes = arr
      .map((b) => String(b?.code ?? "").trim())
      .filter(Boolean)
      .join(",");
    return { ok: res.ok, status: res.status, data: codes };
  }

  // Disbursement - Create
  disbursementCreatePayment(data: {
    bank_code: string;
    account_number: string;
    account_name: string;
    amount: number;
    desc?: string;
    trxId: string;
  }) {
    const external_id = `eBelanja_Disb_${data.bank_code}_${data.trxId}`;

    return this.request({
      path: "/disbursements",
      apiVersion: "v1",
      idempotencyKey: data.trxId, // header
      body: {
        external_id,
        amount: data.amount,
        bank_code: data.bank_code,
        account_holder_name: data.account_name,
        account_number: data.account_number,
        ...(data.desc ? { description: data.desc } : {}),
      },
    });
  }

  // Disbursement - Get By Id
  disbursementGetById(id: string) {
    return this.request({
      path: `/disbursements/${encodeURIComponent(id)}`,
      method: "GET",
      apiVersion: "v1",
    });
  }

  // payment_simulation
  paymentSimulation(id = "11111", amount = 50000) {
    return this.request({
      path: `/qr_codes/${encodeURIComponent(id)}/payments/simulate`,
      apiVersion: "v1",
      body: { amount },
    });
  }

  // parse struck
  parseStruck(data: any, res: any) {
    return [
      { label: "KODE TRANSFER", type: "string", value: data?.external_id },
      { label: "BANK", type: "string", value: data?.bank_code },
      { label: "TUJUAN", type: "string", value: res?.to_rekening },
      { label: "NAMA", type: "string", value: data?.account_holder_name },
      { label: "NOMINAL", type: "rupiah", value: data?.amount },
    ];
  }

  // check_callback_token
  checkCallbackToken(token?: string | null) {
    return !!token && token === this.config.callbackToken;
  }
}
