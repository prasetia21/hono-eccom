import { envSchema } from "@/config/env";
import { pinoLogger } from "@/libs/logger";
import { CACHE_TTL } from "@/shared/constants/general";
import { createClient, type RedisClientType, type RedisClientOptions } from "redis";
import { parsePhpSerialize, phpSerialize } from "@/shared/utils/serialize.ts";

let redisInstance: RedisClientType | null = null;
let connectionPromise: Promise<RedisClientType> | null = null;

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

const redisConfig: RedisClientOptions = {
  password: envSchema.REDIS_PASSWORD,
  database: envSchema.REDIS_DB,
  socket: {
    host: envSchema.REDIS_HOST,
    port: envSchema.REDIS_PORT,
    connectTimeout: envSchema.REDIS_CONNECT_TIMEOUT,
    keepAlive: envSchema.REDIS_KEEP_ALIVE > 0,
    reconnectStrategy: (retries: number) => {
      if (retries > envSchema.REDIS_MAX_RETRIES) {
        pinoLogger.error("Redis max retries exceeded");
        return new Error("Max retries exceeded");
      }
      return Math.min(retries * envSchema.REDIS_RETRY_DELAY, envSchema.REDIS_MAX_RETRY_DELAY);
    },
  },
  disableOfflineQueue: !envSchema.REDIS_ENABLE_OFFLINE_QUEUE,
};

const withGlobalPrefix = (key: string): string => {
  const globalPrefix = envSchema.REDIS_KEY_PREFIX || "";
  return `${globalPrefix}${key}`;
};

export const getRedis = (): Promise<RedisClientType> => {
  // Jika instance sudah terkoneksi
  if (redisInstance && redisInstance.isReady) {
    return Promise.resolve(redisInstance);
  }

  // Jika instance sedang proses koneksi
  if (connectionPromise) {
    return connectionPromise;
  }

  const client = createClient(redisConfig) as RedisClientType;

  client.on("connect", () => {
    if (envSchema.REDIS_ENABLE_LOGGING) {
      pinoLogger.info("Redis connecting...");
    }
  });

  client.on("ready", () => {
    if (envSchema.REDIS_ENABLE_LOGGING) {
      pinoLogger.info("Redis connection ready");
    }
  });

  client.on("error", (err) => {
    pinoLogger.error({ err }, "Redis connection error");
  });

  client.on("end", () => {
    // node-redis menggunakan 'end' sebagai ganti 'close'
    if (envSchema.REDIS_ENABLE_LOGGING) {
      pinoLogger.warn("Redis connection closed");
    }
  });

  client.on("reconnecting", () => {
    // node-redis reconnecting event tidak membawa parameter delay
    if (envSchema.REDIS_ENABLE_LOGGING) {
      pinoLogger.warn("Redis reconnecting");
    }
  });

  connectionPromise = client.connect().then(() => {
    redisInstance = client;
    return redisInstance;
  });

  return connectionPromise;
};

export const redisSet = async (
  key: string,
  value: string,
  ttlInSeconds?: number,
): Promise<string | null> => {
  const redis = await getRedis();
  const prefixedKey = withGlobalPrefix(key);

  if (ttlInSeconds) {
    return redis.set(prefixedKey, value, { EX: ttlInSeconds });
  }
  return redis.set(prefixedKey, value);
};

export const redisGet = async (key: string): Promise<string | null> => {
  const redis = await getRedis();
  return redis.get(withGlobalPrefix(key));
};

export const redisDel = async (key: string): Promise<number> => {
  const redis = await getRedis();
  return redis.del(withGlobalPrefix(key));
};

export const redisIncr = async (key: string): Promise<number> => {
  const redis = await getRedis();
  return redis.incr(withGlobalPrefix(key));
};

export const checkRedisConnection = async (): Promise<{
  status: string;
  error: string | null;
}> => {
  try {
    const redis = await getRedis();
    await redis.ping();
    return { status: "connected", error: null };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    connectionPromise = null;
    pinoLogger.info("Redis connection closed successfully");
  }
};

const buildKey = (key: string, prefix?: string): string => {
  return prefix ? `${prefix}:${key}` : key;
};

export const cacheSet = async <T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<boolean> => {
  try {
    const { ttl = CACHE_TTL.THIRTY_HOUR, prefix } = options;
    const finalKey = buildKey(key, prefix);
    const serialized = JSON.stringify(value);

    await redisSet(finalKey, serialized, ttl);

    pinoLogger.debug({ key: finalKey, ttl }, "Value cached");

    return true;
  } catch (err) {
    pinoLogger.error({ error: err, key }, "Failed to cache value");
    return false;
  }
};

export const cacheSetSerialize = async <T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<boolean> => {
  try {
    const { ttl = CACHE_TTL.THIRTY_HOUR, prefix } = options;
    const finalKey = buildKey(key, prefix);
    const serializedData = phpSerialize(value);

    await redisSet(finalKey, serializedData);

    pinoLogger.debug({ key: finalKey, ttl }, "Value cached");

    return true;
  } catch (err) {
    pinoLogger.error({ error: err, key }, "Failed to cache value");
    return false;
  }
};

export const cacheGet = async <T>(
  key: string,
  options: Pick<CacheOptions, "prefix"> = {},
): Promise<T | null> => {
  try {
    const { prefix } = options;
    const finalKey = buildKey(key, prefix);
    const cached = await redisGet(finalKey);

    if (!cached) {
      pinoLogger.debug({ key: finalKey }, "Cache miss");
      return null;
    }

    pinoLogger.debug({ key: finalKey }, "Cache hit");

    return JSON.parse(cached) as T;
  } catch (err) {
    pinoLogger.error({ error: err, key }, "Failed to get cached value");
    return null;
  }
};

export const cacheGetSerialize = async <T>(
  key: string,
  options: Pick<CacheOptions, "prefix"> = {},
): Promise<T | null> => {
  try {
    const { prefix } = options;
    const finalKey = buildKey(key, prefix);
    const cached = await redisGet(finalKey);

    if (!cached) {
      pinoLogger.debug({ key: finalKey }, "Cache miss");
      return null;
    }

    if (
      cached.startsWith("O:") ||
      cached.startsWith("a:") ||
      cached.startsWith("s:") ||
      cached.startsWith("b:") ||
      cached.startsWith("i:")
    ) {
      pinoLogger.debug({ key: finalKey }, "Cache hit");
      const parsed = parsePhpSerialize(cached);

      if (parsed !== null) return parsed as T;
    }

    try {
      return JSON.parse(cached) as T;
    } catch {
      return cached as unknown as T;
    }
  } catch (err) {
    pinoLogger.error({ error: err, key }, "Failed to get cached value");
    return null;
  }
};

export const cacheDelete = async (
  key: string,
  options: Pick<CacheOptions, "prefix"> = {},
): Promise<boolean> => {
  try {
    const { prefix } = options;
    const finalKey = buildKey(key, prefix);
    const deleted = await redisDel(finalKey);

    pinoLogger.debug({ key: finalKey }, "Cache deleted");

    return deleted > 0;
  } catch (err) {
    pinoLogger.error({ error: err, key }, "Failed to delete cached value");
    return false;
  }
};

export const cacheGetOrSet = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> => {
  const { prefix } = options;

  const cached = await cacheGet<T>(key, { prefix });
  if (cached !== null) {
    return cached;
  }

  const value = await fetcher();

  await cacheSet(key, value, options);

  return value;
};

export const cacheInvalidatePattern = async (
  pattern: string,
  options: Pick<CacheOptions, "prefix"> = {},
): Promise<number> => {
  try {
    const { prefix } = options;
    const finalPattern = buildKey(pattern, prefix);
    const globalPattern = withGlobalPrefix(finalPattern);

    const redis = await getRedis();
    const keys = await redis.keys(globalPattern);

    if (keys.length === 0) {
      return 0;
    }

    const deleted = await redis.del(keys);

    pinoLogger.info({ pattern: finalPattern, count: deleted }, "Cache pattern invalidated");

    return deleted;
  } catch (err) {
    pinoLogger.error({ error: err, pattern }, "Failed to invalidate cache pattern");
    return 0;
  }
};

export const cacheable = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator: (...args: TArgs) => string,
  options: CacheOptions = {},
) => {
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator(...args);
    return await cacheGetOrSet(key, () => fn(...args), options);
  };
};

export const cacheExists = async (
  key: string,
  options: Pick<CacheOptions, "prefix"> = {},
): Promise<boolean> => {
  try {
    const { prefix } = options;
    const finalKey = buildKey(key, prefix);
    const redis = await getRedis();

    const exists = await redis.exists(withGlobalPrefix(finalKey));

    return exists === 1;
  } catch (err) {
    pinoLogger.error({ error: err, key }, "Failed to check cache existence");
    return false;
  }
};

export const cacheTTL = async (
  key: string,
  options: Pick<CacheOptions, "prefix"> = {},
): Promise<number> => {
  try {
    const { prefix } = options;
    const finalKey = buildKey(key, prefix);
    const redis = await getRedis();

    return await redis.ttl(withGlobalPrefix(finalKey));
  } catch (err) {
    pinoLogger.error({ error: err, key }, "Failed to get cache TTL");
    return -1;
  }
};
