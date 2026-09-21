export type SendMailResult = {
  success: boolean;
  message: string;
  data?: any;
};

export interface MailProvider {
  sendMail(to: string, subject: string, html: string, fromName?: string): Promise<SendMailResult>;
}
