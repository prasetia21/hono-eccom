import type { MailProvider, SendMailResult } from "@/providers/email/service/type.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

export class MailjetProvider implements MailProvider {
  constructor(
    private config: {
      fromEmail: string;
      fromName: string;
      publicKey: string;
      privateKey: string;
    },
  ) {}

  async sendMail(to: string, subject: string, html: string): Promise<SendMailResult> {
    try {
      const res = await providerRequest<any>("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        basicAuth: {
          username: this.config.publicKey,
          password: this.config.privateKey,
        },
        json: {
          Messages: [
            {
              From: {
                Email: this.config.fromEmail,
                Name: this.config.fromName,
              },
              To: [{ Email: to, Name: to }],
              Subject: subject,
              HTMLPart: html,
            },
          ],
        },
      });

      if (!res.ok) {
        return {
          success: false,
          message: `Gagal (${res.status})`,
          data: res.data,
        };
      }

      return {
        success: true,
        message: "Berhasil",
        data: {
          status: res.status,
          requestId: res.headers?.get("x-mj-request-guid"),
          body: res.data,
        },
      };
    } catch (e: any) {
      return { success: false, message: e?.message ?? "Error" };
    }
  }
}
