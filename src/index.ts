import { serve } from "@hono/node-server";
import { pinoLogger } from "@/libs/logger";
import { checkRedisConnection } from "@/libs/redis";
import { checkDbConnection } from "@/libs/postgresql";
import { checkS3Connection } from "@/libs/s3";
import { envSchema } from "@/config/env";
import app from "./app";

const rawHost = envSchema.APP_HOST || "http://localhost";
const host = new URL(rawHost);

const logHealth = async (
  name: string,
  checker: () => Promise<{ status: string; error: string | null }>,
) => {
  const result = await checker();
  const base = { service: name, status: result.status };
  const msg = result.error
    ? `${name.toUpperCase()} FAILED: ${result.error}`
    : `${name.toUpperCase()} OK`;

  if (result.status === "connected") {
    pinoLogger.info(base, msg);
  } else {
    pinoLogger.error({ ...base, error: result.error }, msg);
  }
  return result;
};

const run = async () => {
  pinoLogger.info("Running startup health checks");

  // Jalankan health checks sebelum server menerima request
  await Promise.all([
    logHealth("redis", checkRedisConnection),
    logHealth("postgresql", checkDbConnection),
    logHealth("s3", checkS3Connection),
  ]);

  serve(
    {
      fetch: app.fetch,
      port: envSchema.APP_PORT,
      hostname: host.hostname,
    },
    (info) => {
      pinoLogger.info(`Server is running on ${rawHost}:${info.port}`);
    },
  );
};

run().catch((err) => {
  pinoLogger.error({ err }, "Startup failed");
  process.exit(1);
});
