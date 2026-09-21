import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { CourierExpeditionService } from "./courier-expedition.service.ts";
import type { CourierPriceRequest } from "./courier-expedition.dto.ts";

export class CourierExpeditionController {
  private service: CourierExpeditionService;

  constructor() {
    this.service = new CourierExpeditionService();
  }

  getCourierPrice = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as CourierPriceRequest;

    const authData = c.get("authData") as { customer_id?: string | number } | undefined;
    if (authData?.customer_id) {
      payload.customer_id = String(authData.customer_id);
    }

    const result = await this.service.getCourierPrice(payload);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
