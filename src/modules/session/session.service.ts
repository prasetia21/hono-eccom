import type { SessionServiceResult } from "@/modules/session/session.dto.ts";
import { cacheSetSerialize } from "@/libs/redis.ts";
import { envSchema } from "@/config/env.ts";
import { encryptString, sha256 } from "@/shared/utils/crypto-helper.ts";
import { HTTP_STATUS } from "@/shared/constants/http-status.ts";

export class SessionService {
  async getInit(ip: string): Promise<SessionServiceResult> {
    const hexUuid = crypto.randomUUID().replace(/-/g, "");
    const token = hexUuid + hexUuid + sha256(ip) + hexUuid + hexUuid;

    await cacheSetSerialize(token, ip, {
      ttl: 60 * envSchema.APP_SESSION_EXPIRATION,
    });

    const sessionToken = encryptString(token);

    return {
      statusCode: HTTP_STATUS.OK,
      success: true,
      message: "Berhasil",
      token: sessionToken,
    };
  }
}
