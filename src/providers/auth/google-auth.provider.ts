import { providerRequest } from "@/providers/http/http-client.ts";
import { envSchema } from "@/config/env.ts";

export type GoogleIdentity = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

type GoogleTokenInfo = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  exp?: string;
};

export class GoogleAuthProvider {
  private readonly config: {
    clientId: string;
    tokenInfoUrl: string;
    timeoutMs: number;
  };

  constructor() {
    this.config = {
      clientId: envSchema.GOOGLE_CLIENT_ID?.trim() ?? "",
      tokenInfoUrl:
        envSchema.GOOGLE_TOKEN_INFO_URL?.trim() || "https://oauth2.googleapis.com/tokeninfo",
      timeoutMs: Number(envSchema.GOOGLE_TIMEOUT_MS ?? 10_000),
    };
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity | null> {
    if (!this.config.clientId) {
      throw new Error("GOOGLE_OAUTH_CLIENT_ID wajib diisi");
    }

    const url = new URL(this.config.tokenInfoUrl);
    url.searchParams.set("id_token", idToken);
    const response = await providerRequest<GoogleTokenInfo>(url.toString(), {
      timeoutMs: this.config.timeoutMs,
    });
    const payload = response.data;
    const expiresAt = Number(payload?.exp ?? 0);

    if (
      !response.ok ||
      !payload?.sub ||
      !payload.email ||
      payload.aud !== this.config.clientId ||
      payload.email_verified !== "true" ||
      !Number.isFinite(expiresAt) ||
      expiresAt * 1000 <= Date.now()
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.picture ? { picture: payload.picture } : {}),
    };
  }
}
