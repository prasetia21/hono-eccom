import type { Context } from "hono";
import type { ContentType } from "@/shared/types/content-type";
import { SessionService } from "./session.service";
import { getClientIp } from "@/shared/utils/request-body.ts";

export class SessionController {
  private service: SessionService;

  constructor() {
    this.service = new SessionService();
  }

  session = async (c: Context<ContentType>): Promise<Response> => {
    const result = await this.service.getInit(getClientIp(c));

    const { statusCode, ...responseData } = result;

    return c.json(responseData, statusCode);
  };
}
