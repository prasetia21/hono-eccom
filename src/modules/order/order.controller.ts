import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { OrderService } from "./order.service.ts";
import type {
  CancelOrderRequest,
  FinishOrderRequest,
  TransactionAuthData,
  TransactionV3Request,
} from "./order.dto.ts";

export class OrderController {
  private service: OrderService;

  constructor() {
    this.service = new OrderService();
  }

  finishOrder = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as FinishOrderRequest;

    const authData = c.get("authData") as
      | { customer_id?: string | number; customer_status?: string }
      | undefined;

    if (authData?.customer_id) {
      payload.customer_id = String(authData.customer_id);
    }
    if (authData?.customer_status) {
      payload.customer_status = String(authData.customer_status);
    }

    const result = await this.service.finishOrder(payload);
    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  cancelOrder = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as CancelOrderRequest;

    const authData = c.get("authData") as
      | { customer_id?: string | number; customer_status?: string }
      | undefined;

    if (authData?.customer_id) {
      payload.customer_id = String(authData.customer_id);
    }
    if (authData?.customer_status) {
      payload.customer_status = String(authData.customer_status);
    }

    const result = await this.service.cancelOrder(payload);
    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };

  transactionV3 = async (c: Context<ContentType>): Promise<Response> => {
    const payload = c.get("validatedBody") as TransactionV3Request;
    const authData = c.get("authData") as TransactionAuthData | undefined;

    if (!authData?.customer_id) {
      return c.json(
        {
          success: false,
          auth: false,
          message: "Unauthorized",
        },
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const result = await this.service.transactionV3(payload, authData);
    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
