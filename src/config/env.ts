import "dotenv/config";
import { z } from "zod";
import { generateSlug } from "@/shared/utils/slug";

const emptyToUndefined = (value: string | undefined) =>
  value && value.trim() !== "" ? value : undefined;

const appName = process.env.APP_NAME || "Hono";
const defaultCachePrefix = `${generateSlug(appName, "_")}_cache:`;

const envDefinition = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_PORT: z.coerce.number().int().positive().default(9001),
  APP_HOST: z.string().default("http://localhost"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  LOG_STORE: z
    .string()
    .optional()
    .default("false")
    .transform((value) => {
      return ["true", "1", "yes", "on"].includes(value.toLowerCase());
    }),

  LOG_DIR: z.string().default("storage/logs"),
  LOG_FILE: z.string().default("app.log"),
  ERROR_LOG_FILE: z.string().default("error.log"),
  APP_NAME: z.string().default("Hono"),
  API_PATH: z.string().default("api"),
  API_VERSION: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return "";
      return value;
    }),
  APP_KEY: z.string().default(""),
  SECRET_KEY: z.string().default(""),
  APP_SESSION_EXPIRATION: z.coerce.number().int().nonnegative().default(180),
  APP_API_KEY: z.string().default(""),

  DOCS_PATH: z.string().default("api/docs"),

  DATABASE_URL: z.string().default(""),
  DATABASE_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().nonnegative().default(10),
  DATABASE_IDLE_TIMEOUT: z.coerce.number().int().nonnegative().default(30000),
  DATABASE_CONNECTION_TIMEOUT: z.coerce.number().int().nonnegative().default(5000),
  DATABASE_STATEMENT_TIMEOUT: z.coerce.number().int().nonnegative().default(30000),
  DATABASE_ALLOW_EXIT_ON_IDLE: z.coerce.boolean().default(false),
  DATABASE_ENABLE_LOGGING: z
    .preprocess((val) => val === "true" || val === "1" || val === true, z.boolean())
    .default(false),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().transform(emptyToUndefined),
  REDIS_DB: z.coerce.number().int().nonnegative().default(0),
  REDIS_KEY_PREFIX: z
    .string()
    .default(defaultCachePrefix)
    .transform((val) => `${generateSlug(val, "_")}${val.endsWith("_cache:") ? "" : "_cache:"}`),
  REDIS_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  REDIS_RETRY_DELAY: z.coerce.number().int().nonnegative().default(1000),
  REDIS_MAX_RETRY_DELAY: z.coerce.number().int().nonnegative().default(5000),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().int().nonnegative().default(10000),
  REDIS_COMMAND_TIMEOUT: z.coerce.number().int().nonnegative().default(5000),
  REDIS_KEEP_ALIVE: z.coerce.number().int().nonnegative().default(30000),
  REDIS_ENABLE_OFFLINE_QUEUE: z.coerce.boolean().default(true),
  REDIS_LAZY_CONNECT: z.coerce.boolean().default(false),
  REDIS_ENABLE_READY_CHECK: z.coerce.boolean().default(true),
  REDIS_ENABLE_LOGGING: z.coerce.boolean().default(false),

  GOOGLE_CLOUD_PROJECT: z.string().default(""),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional().default("storage/google-service.json"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_TOKEN_INFO_URL: z.string().optional().default("https://oauth2.googleapis.com/tokeninfo"),
  GOOGLE_TIMEOUT_MS: z.coerce.number().optional().default(10_000),

  FCM_PROJECT_ID: z.string().optional().default("belanja-pasti"),
  FCM_TOPIC_PREFIX: z.string().optional().default("devel-"),
  FCM_API_ACCESS_KEY: z.string().optional(),
  FCM_API_ACCESS_KEY_WL: z.string().optional(),
  FCM_API_ACCESS_KEY_WEB: z.string().optional(),

  FACEBOOK_CLIENT_ID: z.string().default(""),
  FACEBOOK_CLIENT_SECRET: z.string().default(""),

  DISCORD_CLIENT_ID: z.string().default(""),
  DISCORD_CLIENT_SECRET: z.string().default(""),

  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@example.com"),

  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  AWS_S3_BUCKET: z.string().default(""),
  AWS_S3_ENDPOINT: z.string().optional().transform(emptyToUndefined),
  AWS_S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),

  QISCUS_URL: z.string().default(""),
  QISCUS_APP_ID: z.string().default(""),
  QISCUS_SECRET_KEY: z.string().default(""),
  QISCUS_CHANNEL_ID: z.string().default(""),
  QISCUS_TEMPLATE_NAME: z.string().default(""),
  QISCUS_TEMPLATE_NAMESPACE: z.string().default(""),

  SMSVIRO_URL: z.string().default(""),
  SMSVIRO_FROM1: z.string().default(""),
  SMSVIRO_FROM2: z.string().default(""),
  SMSVIRO_USERNAME: z.string().default(""),
  SMSVIRO_PASSWORD: z.string().default(""),

  WHAPI_URL: z.string().default(""),
  WHAPI_OTP_API_KEY1: z.string().default(""),
  WHAPI_OTP_API_KEY2: z.string().default(""),
  WHAPI_OTP_API_KEY3: z.string().default(""),
  WHAPI_OTP_API_KEY4: z.string().default(""),
  WHAPI_ADMIN_SELS_API_KEY: z.string().default(""),

  // Email
  SENDGRID_API_KEY: z.string().optional(),
  SENDINBLUE_API_KEY: z.string().optional(),
  MAILJET_PUBLIC_KEY: z.string().optional(),
  MAILJET_PRIVATE_KEY: z.string().optional(),

  // Xfers
  XFERS_SECRET: z.string().optional(),
  XFERS_API_KEY: z.string().optional(),
  XFERS_URL: z.string().optional(),

  // WinPay
  WINPAY_PRIVATE_KEY1: z.string().optional(),
  WINPAY_PRIVATE_KEY2: z.string().optional(),
  WINPAY_PARTNER_ID: z.string().optional(),
  WINPAY_CHANNEL_ID: z.string().optional(),
  WINPAY_URL1: z.string().optional(),
  WINPAY_URL2: z.string().optional(),
  WINPAY_PRIVATE_KEY_PATH: z.string().optional(),

  // Xendit
  XENDIT_SECRET_KEY: z.string().optional(),
  XENDIT_PREFIX: z.string().optional(),
  XENDIT_CALLBACK_TOKEN: z.string().optional(),
  XENDIT_URL: z.string().optional(),

  // Anteraja
  ANTERAJA_URL: z.string().optional(),
  ANTERAJA_ACCESS_KEY: z.string().optional(),
  ANTERAJA_SECRET_KEY: z.string().optional(),
  ANTERAJA_PREFIX_KEY: z.string().optional(),

  // J&T
  JNT_ORDER_KEY: z.string().optional(),
  JNT_ORDER_APIKEY: z.string().optional(),
  JNT_ORDER_USERNAME: z.string().optional(),
  JNT_ORDER_URL: z.string().optional(),
  JNT_TARIFF_KEY: z.string().optional(),
  JNT_TARIFF_USERNAME: z.string().optional(),
  JNT_TARIFF_URL: z.string().optional(),
  JNT_TRACK_AUTH: z.string().optional(),
  JNT_TRACK_PASS: z.string().optional(),
  JNT_TRACK_USERNAME: z.string().optional(),
  JNT_TRACK_URL: z.string().optional(),
  JNT_CANCEL_KEY: z.string().optional(),
  JNT_CANCEL_APIKEY: z.string().optional(),
  JNT_CANCEL_USERNAME: z.string().optional(),
  JNT_CANCEL_URL: z.string().optional(),

  // SiCepat
  SICEPAT_URL1: z.string().optional(),
  SICEPAT_URL2: z.string().optional(),
  SICEPAT_API_KEY: z.string().optional(),
  SICEPAT_AUTH_KEY: z.string().optional(),

  // RajaOngkir
  RAJAONGKIR_URL: z.string().optional(),
  RAJAONGKIR_KEY: z.string().optional(),

  // IDExpress
  IDEXPRESS_URL: z.string().optional(),
  IDEXPRESS_SECURITY_KEY: z.string().optional(),
  IDEXPRESS_APP_ID: z.string().optional(),
});

const parsed = envDefinition.parse(process.env);

export const envSchema = parsed;
