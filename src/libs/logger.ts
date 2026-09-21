import { mkdirSync } from "node:fs";
import path from "node:path";
import { envSchema } from "@/config/env";
import pino, { type LoggerOptions } from "pino";

const isProd = envSchema.NODE_ENV === "production";

const logLevel = envSchema.LOG_LEVEL ?? (isProd ? "info" : "debug");

const baseOptions: LoggerOptions = {
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
};

const createLogger = () => {
  /**
   * Default behavior:
   *
   * development:
   * - console pretty log
   *
   * production:
   * - stdout JSON log
   *
   * LOG_STORE=false:
   * - tidak simpan ke file
   *
   * LOG_STORE=true:
   * - simpan ke storage/logs/app.log
   * - simpan error ke storage/logs/error.log
   */
  if (!envSchema.LOG_STORE) {
    if (isProd) {
      return pino(baseOptions);
    }

    return pino({
      ...baseOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
      },
    });
  }

  const logDir = path.resolve(process.cwd(), envSchema.LOG_DIR);
  const appLogPath = path.join(logDir, envSchema.LOG_FILE);
  const errorLogPath = path.join(logDir, envSchema.ERROR_LOG_FILE);

  mkdirSync(logDir, { recursive: true });

  const targets = [];

  /**
   * Console target.
   *
   * Development:
   * - pretty console
   *
   * Production:
   * - JSON stdout
   */
  if (isProd) {
    targets.push({
      target: "pino/file",
      level: logLevel,
      options: {
        destination: 1,
      },
    });
  } else {
    targets.push({
      target: "pino-pretty",
      level: logLevel,
      options: {
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "SYS:standard",
      },
    });
  }

  /**
   * File log:
   * - app.log: semua log dari LOG_LEVEL ke atas
   * - error.log: hanya error dan fatal
   */
  targets.push({
    target: "pino/file",
    level: logLevel,
    options: {
      destination: appLogPath,
      mkdir: true,
    },
  });

  targets.push({
    target: "pino/file",
    level: "error",
    options: {
      destination: errorLogPath,
      mkdir: true,
    },
  });

  const transport = pino.transport({
    targets,
  });

  return pino(baseOptions, transport);
};

export const pinoLogger = createLogger();
