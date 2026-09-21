import { providerRequest } from "@/providers/http/http-client";
import { envSchema } from "@/config/env.ts";
import { GoogleService } from "@/providers/notification/google-service.ts";

export type NotifType = "notification" | "data";

export interface SubscribeResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

type GcmOptions = {
  projectId?: string;
  topicPrefix?: string;
  apiAccessKey?: string;
  apiAccessKeyWl?: string;
  apiAccessKeyWeb?: string;
};

export class GoogleNotifyProvider {
  private google: GoogleService;
  private projectId: string;
  private topicPrefix: string;
  private apiAccessKey: string;
  private apiAccessKeyWl: string;
  private apiAccessKeyWeb: string;

  constructor(options?: GcmOptions) {
    this.google = new GoogleService();
    this.projectId = options?.projectId || envSchema.FCM_PROJECT_ID || "";
    this.topicPrefix = options?.topicPrefix ?? envSchema.FCM_TOPIC_PREFIX ?? "devel-";
    this.apiAccessKey = options?.apiAccessKey || envSchema.FCM_API_ACCESS_KEY || "";
    this.apiAccessKeyWl =
      options?.apiAccessKeyWl || envSchema.FCM_API_ACCESS_KEY_WL || this.apiAccessKey;
    this.apiAccessKeyWeb =
      options?.apiAccessKeyWeb || envSchema.FCM_API_ACCESS_KEY_WEB || this.apiAccessKey;
  }

  private topicWithPrefix(topic: string) {
    return `${this.topicPrefix}${topic}`;
  }

  private pickApiKey(wl_token?: string) {
    const wl = String(wl_token ?? "").trim();
    return wl ? this.apiAccessKeyWl : this.apiAccessKey;
  }

  private dataToString(data: unknown, errorMsg?: string): string {
    if (data === null || data === undefined) return errorMsg || "";
    return typeof data === "object" ? JSON.stringify(data) : String(data);
  }

  async send(
    topic: string,
    type: string,
    item: unknown,
    title: string,
    msg: string,
    pesan: unknown = [],
    notifType: NotifType = "notification",
    _wl_token = "",
  ): Promise<string> {
    // Removed the try { ... } catch (e) { throw e; } wrapper completely
    const accessToken = await this.google.getAccessToken();

    const fields: any = {
      message: {
        topic: this.topicWithPrefix(topic),
        notification: {
          title,
          body: msg,
        },
        data: {
          type: String(type),
          item: JSON.stringify(item),
          message: JSON.stringify(pesan),
        },
        android: {
          priority: "high",
        },
      },
    };

    if (notifType === "data") {
      delete fields.message.notification;
      fields.message.data.title = String(title);
      fields.message.data.body = String(msg);
    }

    const res = await providerRequest<unknown>(
      `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`,
      {
        method: "POST",
        bearerAuth: accessToken, // Memanfaatkan fitur bearerAuth dari helper
        json: fields,
      },
    );

    const text = this.dataToString(res.data, res.error);

    if (!res.ok) {
      throw new Error(`FCM Error (${res.status}): ${text}`);
    }

    return text;
  }

  async sendToWeb(
    topic: string,
    type: string,
    item: unknown,
    title: string,
    msg: string,
  ): Promise<string> {
    if (!this.apiAccessKeyWeb) {
      throw new Error("FCM_API_ACCESS_KEY_WEB/FCM_API_ACCESS_KEY belum di-set");
    }

    const fields = {
      to: `/topics/${this.topicWithPrefix(topic)}`,
      notification: {
        title,
        body: msg,
        sound: "default",
        show_in_foreground: true,
      },
      data: {
        type: String(type),
        item: JSON.stringify(item),
      },
      priority: "high",
    };

    const res = await providerRequest<unknown>("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${this.apiAccessKeyWeb}`,
      },
      json: fields,
    });

    const text = this.dataToString(res.data, res.error);

    if (!res.ok) {
      throw new Error(`FCM Legacy Error (${res.status}): ${text}`);
    }

    return text;
  }

  async getSubscribedTopics(fcmToken = "", wl_token = ""): Promise<unknown> {
    const key = this.pickApiKey(wl_token);
    if (!key) throw new Error("FCM_API_ACCESS_KEY belum di-set");

    const url = `https://iid.googleapis.com/iid/info/${encodeURIComponent(fcmToken)}?details=true`;

    const res = await providerRequest<unknown>(url, {
      method: "POST",
      headers: {
        Authorization: `key=${key}`,
      },
      json: [],
    });

    if (!res.ok) {
      const text = this.dataToString(res.data, res.error);
      throw new Error(`getSubscribedTopics failed (${res.status}): ${text}`);
    }

    // data sudah otomatis diparsing oleh providerRequest (JSON.parse aman)
    return res.data;
  }

  async fcmtoken_check(fcm_token: string, wl_token = ""): Promise<Record<string, any>> {
    const key = this.pickApiKey(wl_token);
    if (!key) throw new Error("FCM_API_ACCESS_KEY belum di-set");

    const fields = {
      registration_ids: [fcm_token],
    };

    const res = await providerRequest<Record<string, any>>("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${key}`,
      },
      json: fields,
    });

    if (!res.ok) {
      const text = this.dataToString(res.data, res.error);
      throw new Error(`fcmtoken_check failed (${res.status}): ${text}`);
    }

    return res.data || {};
  }

  async subscribe_topic(token: string, topic: string): Promise<string> {
    const accessToken = await this.google.getAccessToken();

    const res = await providerRequest<unknown>(
      `https://iid.googleapis.com/iid/v1/${encodeURIComponent(token)}/rel/topics/${encodeURIComponent(topic)}`,
      {
        method: "POST",
        bearerAuth: accessToken,
        headers: {
          "Content-Type": "application/json",
          access_token_auth: "true",
        },
      },
    );

    const text = this.dataToString(res.data, res.error);

    if (!res.ok) {
      throw new Error(`subscribe_topic failed (${res.status}): ${text}`);
    }

    return text;
  }

  async subscribeTopic(token: string, topic: string): Promise<SubscribeResult> {
    try {
      const result = await this.subscribe_topic(token, this.topicWithPrefix(topic));
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e?.message ?? "subscribeTopic failed" };
    }
  }
}
