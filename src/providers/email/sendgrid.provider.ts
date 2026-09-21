import type { MailProvider, SendMailResult } from "@/providers/email/service/type.ts";
import { providerRequest } from "@/providers/http/http-client.ts";

export class SendgridProvider implements MailProvider {
  constructor(private config: { fromEmail: string; fromName: string; apiKey: string }) {}

  async sendMail(
    to: string,
    subject: string,
    html: string,
    fromName?: string,
  ): Promise<SendMailResult> {
    try {
      const res = await providerRequest<any>("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        bearerAuth: this.config.apiKey,
        json: {
          personalizations: [{ to: [{ email: to, name: to }] }],
          from: {
            email: this.config.fromEmail,
            name: fromName || this.config.fromName,
          },
          subject,
          content: [{ type: "text/html", value: html }],
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
        data: { status: res.status },
      };
    } catch (e: any) {
      return { success: false, message: e?.message ?? "Error" };
    }
  }
}
