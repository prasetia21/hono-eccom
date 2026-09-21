import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { PaymentMethodService } from "./payment-method.service.ts";

export class PaymentMethodController {
  private service: PaymentMethodService;

  constructor() {
    this.service = new PaymentMethodService();
  }

  getPaymentMethod = async (c: Context<ContentType>): Promise<Response> => {
    const result = await this.service.getPaymentMethod();

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
