import { getRedis } from "@/libs/redis";
import { type RedisClient, RedisStore } from "@hono-rate-limiter/redis";
import { rateLimiter } from "hono-rate-limiter";
import { getClientIp } from "@/shared/utils/request-body.ts";

interface RateLimitOptions {
  windowMs: number;
  limit: number;
}

/**
 * Creates a rate limiter middleware using Redis store.
 *
 * @param options - Configuration options for rate limiting.
 * @param options.windowMs - The time window in milliseconds for rate limiting.
 * @param options.limit - The maximum number of allowed requests within the time window.
 * @returns A middleware function that enforces the rate limit and responds with a 429 status code if exceeded.
 *
 * @example
 * app.use("*", rateLimit({ windowMs: 60000, limit: 100 }));
 */
export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, limit } = options;

  const redisClient: RedisClient = {
    scriptLoad: async (script: string) => {
      const redis = await getRedis();
      return (await redis.scriptLoad(script)) as string;
    },
    evalsha: async <TArgs extends unknown[], TData = unknown>(
      sha1: string,
      keys: string[],
      args: TArgs,
    ) => {
      const redis = await getRedis();
      return (await redis.evalSha(sha1, {
        keys,
        arguments: args as string[],
      })) as TData;
    },
    decr: async (key: string) => {
      const redis = await getRedis();
      return redis.decr(key);
    },
    del: async (key: string) => {
      const redis = await getRedis();
      return redis.del(key);
    },
  };

  return rateLimiter({
    windowMs,
    limit,
    standardHeaders: "draft-6",
    keyGenerator: (c) => {
      const path = c.req.path;
      const sessionToken = c.req.header("X-Session-Token")?.trim();

      if (sessionToken) {
        return `${path}:${sessionToken}`;
      }

      const ip = getClientIp(c);
      return `${path}:${ip}`;
    },
    store: new RedisStore({ client: redisClient }),
  });
};
