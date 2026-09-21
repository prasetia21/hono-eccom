import type { MailProvider, SendMailResult } from "@/providers/email/service/type.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

export class SendinblueProvider implements MailProvider {
  constructor(private config: { fromEmail: string; fromName: string; apiKey: string }) {}

  async sendMail(to: string, subject: string, html: string): Promise<SendMailResult> {
    try {
      const res = await providerRequest<any>("https://api.sendinblue.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.config.apiKey,
        },
        json: {
          sender: {
            name: this.config.fromName,
            email: this.config.fromEmail,
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        },
      });

      if (!res.ok) {
        return { success: false, message: "Gagal", data: res.data };
      }

      return { success: true, message: "Berhasil", data: res.data };
    } catch (e: any) {
      return { success: false, message: e?.message ?? "Error" };
    }
  }
}
