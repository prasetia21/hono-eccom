import { eq } from "drizzle-orm";
import { ppobTransTable } from "@/db/schema";
import { db } from "@/libs/postgresql";
import { envSchema } from "@/config/env.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

export type XfersConfig = {
  secret: string;
  apiKey: string;
  baseUrl: string;
};

export type XfersResponse<T = unknown> = {
  success: boolean;
  data: T;
  status: number;
};

function parseBaseUrl(url: string) {
  return url.endsWith("/") ? url : url + "/";
}

export class XfersService {
  private config: XfersConfig;

  constructor(config?: Partial<XfersConfig>) {
    const secret = config?.secret ?? envSchema.XFERS_SECRET?.trim() ?? "";
    const apiKey = config?.apiKey ?? envSchema.XFERS_API_KEY?.trim() ?? "";
    const rawBaseUrl = config?.baseUrl ?? envSchema.XFERS_URL?.trim() ?? "";

    if (!secret || !apiKey || !rawBaseUrl) {
      throw new Error("Xfers config error: Missing required configuration");
    }

    const { baseUrl: _baseUrlOverride, ...restConfig } = config ?? {};

    this.config = {
      secret,
      apiKey,
      baseUrl: parseBaseUrl(rawBaseUrl),
      ...restConfig,
    };
  }

  private async request<T = unknown>(
    path: string,
    method: "GET" | "POST" = "POST",
    body?: unknown,
  ): Promise<XfersResponse<T>> {
    const url = this.config.baseUrl + path.replace(/^\/+/, "");

    const res = await providerRequest<T>(url, {
      method,
      basicAuth: {
        username: this.config.apiKey,
        password: this.config.secret,
      },
      headers: {
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
      json: method === "GET" ? undefined : (body ?? {}),
    });

    return {
      success: res.ok,
      data: res.data as T,
      status: res.status,
    };
  }

  // =========================
  // Virtual Account
  // =========================
  virtualAccount(param: any) {
    let path = "";
    let payload: any = {};

    if (param?.model === "V_A") {
      path = "payment_methods/virtual_bank_accounts";
      payload = {
        data: {
          attributes: {
            bankShortCode: param.bankShortCode,
            referenceId: param.referenceId,
            displayName: param.displayName,
          },
        },
      };
    } else if (param?.model === "VA_Dynamic") {
      path = "payments";
      payload = {
        data: {
          attributes: {
            paymentMethodType: "virtual_bank_account",
            amount: param.amount,
            currency: "IDR",
            referenceId: param.referenceId,
            description: "Pembayaran Ebelanja",
            paymentMethodOptions: {
              bankShortCode: param.bankShortCode,
              displayName: param.displayName,
            },
          },
        },
      };
    } else {
      return Promise.reject(new Error("Invalid model for virtualAccount. Use V_A or VA_Dynamic."));
    }

    return this.request(path, "POST", payload);
  }

  virtual_account(param: any) {
    return this.virtualAccount(param);
  }

  // =========================
  // Retail Outlet
  // =========================
  retailOutlet(param: any) {
    if (param?.model !== "retail_outlet") {
      return Promise.reject(new Error("Invalid model for retailOutlet. Use retail_outlet."));
    }

    return this.request("payments", "POST", {
      data: {
        attributes: {
          paymentMethodType: param.model,
          amount: param.amount,
          referenceId: param.referenceId,
          expiredAt: param.expire,
          description: "Deposit akun" + param.displayName,
          paymentMethodOptions: {
            retailOutletName: param.retailOutlet,
          },
        },
      },
    });
  }

  // =========================
  // QRIS
  // =========================
  qris(param: any) {
    if (param?.model !== "qris")
      return Promise.reject(new Error("Invalid model for qris. Use qris."));

    return this.request("payment_methods/qris", "POST", {
      data: {
        attributes: {
          referenceId: param.referenceId,
          displayName: param.displayName,
        },
      },
    });
  }

  // =========================
  // Disbursements
  // =========================
  getBank() {
    return this.request("banks", "GET");
  }

  checkAccount(param: { to: string; kode_bank: string }) {
    return this.request("validation_services/bank_account_validation", "POST", {
      data: {
        attributes: {
          accountNo: param.to,
          bankShortCode: param.kode_bank,
        },
      },
    });
  }

  disbursements(param: any) {
    if (param?.model !== "transfer") {
      return Promise.reject(new Error("Invalid model for disbursements. Use transfer."));
    }

    return this.request("disbursements", "POST", {
      data: {
        attributes: {
          amount: param.amount,
          referenceId: param.referenceId,
          description: param.description,
          disbursementMethod: {
            type: "bank_transfer",
            bankShortCode: param.bankShortCode,
            bankAccountNo: param.bankAccountNo,
            bankAccountHolderName: param.bankAccountHolderName,
          },
        },
      },
    });
  }

  retrieveDisbursement(disbursementId: string) {
    return this.request(`disbursements/${disbursementId}`, "GET");
  }

  cekDisbursement(param: { disbursementId: string }) {
    return this.retrieveDisbursement(param.disbursementId);
  }

  // =========================
  // Pay & Retrieve
  // =========================
  pay(paymentMethodId: string, amount = 99000) {
    return this.request(`payment_methods/virtual_bank_accounts/${paymentMethodId}/tasks`, "POST", {
      data: {
        attributes: {
          action: "receive_payment",
          options: { amount },
        },
      },
    });
  }

  retrieveQrisPayments(paymentMethodId: string) {
    return this.request(`payment_methods/qris/${paymentMethodId}/payments`, "GET");
  }

  retrieveVA(paymentMethodId: string) {
    return this.request(`payment_methods/virtual_bank_accounts/${paymentMethodId}`, "GET");
  }

  cekVa(param: { paymentMethodId: string }) {
    return this.retrieveVA(param.paymentMethodId);
  }

  // =========================
  // Parse helpers
  // =========================
  parseResponseInq(opt = "", response: any = {}) {
    if (typeof response === "string") {
      try {
        response = JSON.parse(response);
      } catch {
        // skip
      }
    }

    const recData: any = {};

    if (opt === "V_A") {
      recData.Id = response?.data?.id;
      recData.Type = response?.data?.type;
      recData.ReferenceId = response?.data?.attributes?.referenceId;
      recData.BankShortCode = response?.data?.attributes?.instructions?.bankShortCode;
      recData.AccountNo = response?.data?.attributes?.instructions?.accountNo;
      recData.DisplayName = response?.data?.attributes?.instructions?.displayName;
    } else if (opt === "retail_outlet") {
      recData.Id = response?.data?.id;
      recData.Type = response?.data?.attributes?.paymentMethod?.type;
      recData.ReferenceId = response?.data?.attributes?.referenceId;
      recData.Amount = Number(response?.data?.attributes?.amount ?? 0);
      recData.Admin = Number(response?.data?.attributes?.fees ?? 0);
      recData.ExpiredAt = response?.data?.attributes?.expiredAt;
      recData.RetailOutletName =
        response?.data?.attributes?.paymentMethod?.instructions?.retailOutletName;
      recData.PaymentCode = response?.data?.attributes?.paymentMethod?.instructions?.paymentCode;
      recData.DisplayName = response?.data?.attributes?.paymentMethod?.instructions?.displayName;
      recData.Description = response?.data?.attributes?.description;
    } else if (opt === "qris") {
      recData.Id = response?.data?.id;
      recData.Type = response?.data?.type;
      recData.ReferenceId = response?.data?.attributes?.referenceId;
      recData.DisplayName = response?.data?.attributes?.instructions?.displayName;
      recData.ImageUrl = response?.data?.attributes?.instructions?.imageUrl;
    } else if (opt === "VA_Dynamic") {
      recData.Id = response?.data?.id;
      recData.Type = response?.data?.type;
      recData.Status = response?.data?.attributes?.status;
      recData.Amount = response?.data?.attributes?.amount;
      recData.Currency = response?.data?.attributes?.currency;
      recData.CreatedAt = response?.data?.attributes?.createdAt;
      recData.Description = response?.data?.attributes?.description;
      recData.ExpiredAt = response?.data?.attributes?.expiredAt;
      recData.ReferenceId = response?.data?.attributes?.referenceId;
      recData.Fees = response?.data?.attributes?.fees;

      recData.PaymentMethodId = response?.data?.attributes?.paymentMethod?.id;
      recData.PaymentMethodType = response?.data?.attributes?.paymentMethod?.type;
      recData.ReferenceId = response?.data?.attributes?.paymentMethod?.referenceId;
      recData.BankShortCode =
        response?.data?.attributes?.paymentMethod?.instructions?.bankShortCode;
      recData.AccountNo = response?.data?.attributes?.paymentMethod?.instructions?.accountNo;
      recData.DisplayName = response?.data?.attributes?.paymentMethod?.instructions?.displayName;
    } else {
      if (response?.errors?.length) {
        recData.status = "failed";
      } else {
        recData.status = response?.data?.attributes?.status;
        recData.user_id = response?.data?.id;
        recData.external_id = response?.data?.attributes?.referenceId;
        recData.amount = Number(response?.data?.attributes?.amount ?? 0);
        recData.bank_code = response?.data?.attributes?.disbursementMethod?.bankShortCode;
        recData.account_holder_name =
          response?.data?.attributes?.disbursementMethod?.bankAccountHolderName;
        recData.disbursement_description = response?.data?.attributes?.description;
        recData.is_instant = true;
        recData.id = response?.data?.id;
      }
    }

    return recData;
  }

  parse_response_inq(opt = "", response: any = {}) {
    return this.parseResponseInq(opt, response);
  }

  parseStruck(res: any, data: any) {
    return [
      { label: "KODE TRANSFER", type: "string", value: res?.external_id },
      { label: "BANK", type: "string", value: res?.bank_code },
      {
        label: "TUJUAN",
        type: "string",
        value: data?.data?.attributes?.disbursementMethod?.bankAccountNo,
      },
      { label: "NAMA", type: "string", value: res?.account_holder_name },
      { label: "NOMINAL", type: "rupiah", value: res?.amount },
    ];
  }

  async generateTrxId(): Promise<string> {
    while (true) {
      const pattern0 = String(
        Number(String(Date.now()).slice(0, 4)) + new Date().getFullYear(),
      ).slice(0, 3);
      const pattern1 = String(Math.floor(performance.now() % 1000)).padStart(3, "0");
      const pattern2 = String(Math.floor(111111 + Math.random() * (999999 - 111111)));
      const trxId = `${pattern0}${pattern1}${pattern2}`;

      const rows = await db
        .select({ ppobTransId: ppobTransTable.ppobTransId })
        .from(ppobTransTable)
        .where(eq(ppobTransTable.ppobTransTrxId, trxId))
        .limit(1);

      if (rows.length === 0) return trxId;
    }
  }

  cekResponVa(response: any = {}) {
    const r = response;
    return {
      Id: r?.id,
      Type: r?.type,
      ReferenceId: r?.attributes?.referenceId,
      Description: r?.attributes?.description,
      Price: r?.attributes?.amount,
      Status: r?.attributes?.status,
      CreatedAt: r?.attributes?.createdAt,
      Fees: r?.attributes?.fees,
      PaymentMethodId: r?.attributes?.paymentMethod?.id,
      PaymentMethodtype: r?.attributes?.paymentMethod?.type,
      PaymentMethodReferenceId: r?.attributes?.paymentMethod?.referenceId,
      BankShortCode: r?.attributes?.paymentMethod?.instructions?.bankShortCode,
      AccountNo: r?.attributes?.paymentMethod?.instructions?.accountNo,
      DisplayName: r?.attributes?.paymentMethod?.instructions?.displayName,
    };
  }

  cekResponTransfer(response: any = {}) {
    const r = response;
    return {
      Id: r?.id,
      Type: r?.type,
      ReferenceId: r?.attributes?.referenceId,
      Description: r?.attributes?.description,
      Price: r?.attributes?.amount,
      Status: r?.attributes?.status,
      CreatedAt: r?.attributes?.createdAt,
      Fees: r?.attributes?.fees,
      BankAccountNo: r?.attributes?.disbursementMethod?.bankAccountNo,
      disbursementMethodtype: r?.attributes?.disbursementMethod?.type,
      BankAccountHolderName: r?.attributes?.disbursementMethod?.bankAccountHolderName,
      BankShortCode: r?.attributes?.disbursementMethod?.bankShortCode,
      ServerBankAccountHolderName: r?.attributes?.disbursementMethod?.serverBankAccountHolderName,
      BankName: r?.attributes?.disbursementMethod?.bankName,
      FailureReason: r?.attributes?.disbursementMethod?.failureReason,
    };
  }
}
