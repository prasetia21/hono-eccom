import { drizzle } from "drizzle-orm/node-postgres";
import { DefaultLogger, type LogWriter } from "drizzle-orm/logger";
import { Pool } from "pg";
import { envSchema } from "@/config/env";
import * as schema from "@/db/schema";
import { pinoLogger } from "@/libs/logger";

const poolConfig = {
  connectionString: envSchema.DATABASE_URL,
  max: envSchema.DATABASE_POOL_MAX,
  allowExitOnIdle: false,
  // idleTimeoutMillis: 30_000,
  // connectionTimeoutMillis: 10_000,
  keepAlive: true,
};

const pool = new Pool(poolConfig);

pool.on("connect", (client) => {
  if (envSchema.DATABASE_ENABLE_LOGGING) {
    pinoLogger.info("New database connection established");
  }

  client.on("error", (err: Error) => {
    const msg = err instanceof Error ? err.message : String(err);
    pinoLogger.error(`Database connection error: ${msg}`);
  });
});

class PinoDbLogger implements LogWriter {
  write(message: string) {
    pinoLogger.info(`[DB SQL] ${message}`);
  }
}

export const db = drizzle(pool, {
  schema,
  logger: envSchema.DATABASE_ENABLE_LOGGING
    ? new DefaultLogger({ writer: new PinoDbLogger() })
    : false,
});

export const checkDbConnection = async () => {
  try {
    await pool.query("SELECT 1");
    return { status: "connected", error: null };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

export const getDbPoolStats = () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: pool.options.max,
  };
};

export const closeDbPool = async () => {
  try {
    await pool.end();
    pinoLogger.info("Database pool closed successfully");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pinoLogger.error(`Error closing database pool: ${msg}`);
    throw err;
  }
};
