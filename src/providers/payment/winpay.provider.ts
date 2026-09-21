import { createHash, createSign, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
import { toISO8601String } from "@/shared/utils/date.ts";
import { envSchema } from "@/config/env.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

export type WinPayConfig = {
  privateKey1: string;
  privateKey2: string;
  partnerId: string;
  channelId: string;
  url1: string;
  url2: string;
  privateKeyPath?: string;
};

export type WinPayResponse<T = unknown> = {
  success: boolean;
  data: T;
  status: number;
};

function parseBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function joinUrl(base: string, path: string) {
  const b = parseBaseUrl(base);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function basicAuthHeader(user: string, pass: string) {
  const token = Buffer.from(`${user}:${pass}`).toString("base64");
  return `Basic ${token}`;
}

export class WinPayService {
  private config: WinPayConfig;
  private cachedPem?: string;

  constructor(config?: Partial<WinPayConfig>) {
    const privateKey1 = config?.privateKey1 ?? envSchema.WINPAY_PRIVATE_KEY1?.trim() ?? "";
    const privateKey2 = config?.privateKey2 ?? envSchema.WINPAY_PRIVATE_KEY2?.trim() ?? "";
    const partnerId = config?.partnerId ?? envSchema.WINPAY_PARTNER_ID?.trim() ?? "";
    const channelId = config?.channelId ?? envSchema.WINPAY_CHANNEL_ID?.trim() ?? "";

    const rawUrl1 = config?.url1 ?? envSchema.WINPAY_URL1?.trim() ?? "";
    const rawUrl2 = config?.url2 ?? envSchema.WINPAY_URL2?.trim() ?? "";

    const privateKeyPath = config?.privateKeyPath ?? envSchema.WINPAY_PRIVATE_KEY_PATH?.trim();

    if (!privateKey1 || !privateKey2 || !partnerId || !channelId || !rawUrl1 || !rawUrl2) {
      throw new Error("Winpay config error: Missing required configuration");
    }

    this.config = {
      privateKey1,
      privateKey2,
      partnerId,
      channelId,
      url1: parseBaseUrl(rawUrl1),
      url2: parseBaseUrl(rawUrl2),
      privateKeyPath,
      ...config,
    };

    if (!this.config.privateKeyPath) {
      throw new Error("Missing env: WINPAY_PRIVATE_KEY_CONTENT or WINPAY_PRIVATE_KEY_PATH");
    }
  }

  private normalizePem(raw: string): string {
    if (!raw) return "";
    let pem = raw.trim();

    if ((pem.startsWith('"') && pem.endsWith('"')) || (pem.startsWith("'") && pem.endsWith("'"))) {
      pem = pem.slice(1, -1);
    }

    pem = pem.replace(/\\n/g, "\n").trim();

    if (pem.startsWith("LS0tLS")) {
      try {
        pem = Buffer.from(pem, "base64").toString("utf8").trim();
      } catch {
        // skip
      }
    }

    if (!pem.includes("-----BEGIN")) {
      pem = `-----BEGIN RSA PRIVATE KEY-----\n${pem}\n-----END RSA PRIVATE KEY-----`;
    }

    return pem;
  }

  private getPrivateKeyPem(): string {
    if (this.cachedPem) return this.cachedPem;

    if (!this.config.privateKeyPath) {
      throw new Error("privateKeyPath is not set");
    }

    let filePath = this.config.privateKeyPath.trim();

    if (!existsSync(filePath)) {
      const stripped = filePath.replace(/^\/+/, "");
      const fromCwd = resolve(process.cwd(), stripped);

      if (existsSync(fromCwd)) {
        filePath = fromCwd;
      } else if (!isAbsolute(filePath)) {
        filePath = resolve(process.cwd(), filePath);
      }
    }

    if (!existsSync(filePath)) {
      throw new Error(
        `File private key WinPay tidak ditemukan di path: ${filePath} (Pastikan file berada di folder storage/)`,
      );
    }

    const fileContent = readFileSync(filePath, "utf8");
    this.cachedPem = this.normalizePem(fileContent);
    return this.cachedPem;
  }

  // Signature
  private sha256HexLower(body: unknown): string {
    const minified = JSON.stringify(body ?? {}, (_k, v) => v);
    return createHash("sha256").update(minified).digest("hex").toLowerCase();
  }

  private generateSignature(method: string, pathUrl: string, payload: unknown, timestamp: string) {
    const bodySha256 = this.sha256HexLower(payload);
    const stringToSign = `${method}:${pathUrl}:${bodySha256}:${timestamp}`;

    const signer = createSign("RSA-SHA256");
    signer.update(stringToSign);
    signer.end();

    const pem = this.getPrivateKeyPem();
    const signature = signer.sign(pem);
    return signature.toString("base64");
  }

  private async request<T = unknown>(opt: {
    baseUrl: string;
    pathUrl: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers: Record<string, string>;
    body?: unknown;
  }): Promise<WinPayResponse<T>> {
    const url = joinUrl(opt.baseUrl, opt.pathUrl);

    const res = await providerRequest<T>(url, {
      method: opt.method,
      headers: opt.headers,
      json: opt.method === "GET" ? undefined : (opt.body ?? {}),
    });

    return {
      success: res.ok,
      data: res.data as T,
      status: res.status,
    };
  }

  // Register Submerchant
  registerSubmerchant(body: unknown) {
    const auth = basicAuthHeader(this.config.privateKey1, this.config.privateKey2);
    const pathUrl = "/api/v3/register/sub";

    return this.request({
      baseUrl: this.config.url1,
      pathUrl,
      method: "POST",
      headers: {
        Authorization: auth,
      },
      body,
    });
  }

  // QRIS Generate (v1)
  generateQris(params: {
    partnerRef: string;
    staticInfo: boolean;
    subMerchantId?: string;
    nominal?: number | string;
    expiredTime?: string;
  }) {
    const timestamp = toISO8601String();
    const externalId = randomBytes(16).toString("hex");
    const pathUrl = "/v1.0/qr/qr-mpm-generate";
    const method = "POST" as const;

    const payload: any = {
      partnerReferenceNo: params.partnerRef,
      additionalInfo: { isStatic: params.staticInfo },
    };

    const version = "v1" as const;

    if (params.staticInfo) {
      payload.subMerchantId = params.subMerchantId;
    } else {
      const numVal = Number(params.nominal);
      payload.amount = {
        value: !isNaN(numVal) ? numVal.toFixed(2) : String(params.nominal),
        currency: "IDR",
      };
      // Format waktu ISO 8601
      payload.validityPeriod =
        params.expiredTime ?? toISO8601String(new Date(Date.now() + 15 * 60 * 1000));
    }

    const signature = this.generateSignature(method, pathUrl, payload, timestamp);
    return this.sendSignedRequest(
      version,
      method,
      payload,
      pathUrl,
      signature,
      timestamp,
      externalId,
    );
  }

  generate_qris(params: {
    partnerRef: string;
    staticInfo: boolean;
    subMerchantId?: string;
    nominal?: number | string;
    expiredTime?: string;
  }) {
    return this.generateQris(params);
  }

  // QRIS Generate (v2)
  generateQrisV2(param: {
    partnerReferenceNo: string;
    amount: number | string;
    additionalInfo: boolean;
    external_id?: string;
    validityPeriod?: string;
  }) {
    const timestamp = toISO8601String();
    const externalId = param.external_id ?? randomBytes(16).toString("hex");
    const method = "POST" as const;
    const pathUrl = "/v1.0/qr/qr-mpm-generate";

    const numVal = Number(param.amount);
    const payload = {
      partnerReferenceNo: param.partnerReferenceNo,
      amount: {
        value: !isNaN(numVal) ? numVal.toFixed(2) : String(param.amount),
        currency: "IDR",
      },
      validityPeriod:
        param.validityPeriod ?? toISO8601String(new Date(Date.now() + 3 * 60 * 60 * 1000)), // +3 jam
      additionalInfo: { isStatic: param.additionalInfo },
    };

    const signature = this.generateSignature(method, pathUrl, payload, timestamp);
    return this.sendSignedRequest("v2", method, payload, pathUrl, signature, timestamp, externalId);
  }

  private sendSignedRequest<T = unknown>(
    version: "v1" | "v2",
    method: "POST" | "GET",
    payload: unknown,
    pathUrl: string,
    signature: string,
    timestamp: string,
    externalId: string,
  ): Promise<WinPayResponse<T>> {
    const baseUrl = version === "v1" ? this.config.url2 : joinUrl(this.config.url1, "/snap");
    return this.request<T>({
      baseUrl,
      pathUrl,
      method,
      headers: {
        "X-TIMESTAMP": timestamp,
        "X-SIGNATURE": signature,
        "X-PARTNER-ID": this.config.partnerId,
        "X-EXTERNAL-ID": externalId,
        "CHANNEL-ID": this.config.channelId,
        Accept: "application/json",
      },
      body: payload,
    });
  }

  // parse response
  parseResponseInqV2(opt = "", response: any = {}) {
    if (opt === "qris") {
      return {
        ResponseCode: response?.responseCode,
        ResponseMessage: response?.responseMessage,
        PartnerReferenceNo: response?.partnerReferenceNo,
        QrContent: response?.qrContent,
        QrUrl: response?.qrUrl,
        TerminalId: response?.terminalId,
        ContractId: response?.additionalInfo?.contractId ?? null,
        ExpiredAt: response?.additionalInfo?.expiredAt ?? null,
        IsStatic: response?.additionalInfo?.isStatic ?? null,
      };
    }
    return { status: "failed" };
  }
}
