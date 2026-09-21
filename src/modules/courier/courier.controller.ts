import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { CourierService } from "./courier.service";
import type { DeliveryPriceV2Request } from "./courier.dto";

export class CourierController {
  private service: CourierService;

  constructor() {
    this.service = new CourierService();
  }

  deliveryPriceV2 = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as DeliveryPriceV2Request;

    const authData = c.get("authData") as { customer_id?: string | number } | undefined;
    if (authData?.customer_id) {
      payload.customer_id = String(authData.customer_id);
    }

    const result = await this.service.deliveryPriceV2(payload);

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
