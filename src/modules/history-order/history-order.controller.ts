import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { HistoryOrderService } from "./history-order.service";
import type { GetHistoryOrderRequest, GetShippingTrackingRequest } from "./history-order.dto";

export class HistoryOrderController {
  private service: HistoryOrderService;

  constructor() {
    this.service = new HistoryOrderService();
  }

  getHistoryOrder = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as GetHistoryOrderRequest;

    const authData = c.get("authData") as { customer_id?: string | number } | undefined;
    if (authData?.customer_id) {
      payload.customer_id = String(authData.customer_id);
    }

    const result = await this.service.getHistoryOrder(payload, c.req.url);
    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  getShippingTracking = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as GetShippingTrackingRequest;

    const authData = c.get("authData") as { customer_id?: string | number } | undefined;
    if (authData?.customer_id) {
      payload.customer_id = String(authData.customer_id);
    }

    const result = await this.service.getShippingTracking(payload);
    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
