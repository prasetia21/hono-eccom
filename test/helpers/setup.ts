import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { vi } from "vitest";

process.env.NODE_ENV ??= "test";

const rootDir = process.cwd();

const loadEnvFile = (fileName: string) => {
  const filePath = path.resolve(rootDir, fileName);

  if (existsSync(filePath)) {
    config({
      path: filePath,
      override: false,
    });
  }
};

/**
 * Urutan prioritas:
 *
 * 1. process.env dari shell/CI tetap paling tinggi
 * 2. .env.test
 * 3. .env.development
 * 4. .env
 *
 * Karena override: false, value yang sudah ada tidak akan ditimpa.
 */
loadEnvFile(".env.test");
loadEnvFile(".env.development");
loadEnvFile(".env");

process.env.APP_HOST ??= "http://localhost";
process.env.APP_PORT ??= "9001";

process.env.API_PATH ??= "api";
process.env.API_VERSION ??= "v1";
process.env.DOCS_PATH ??= "api/docs";

vi.mock("@/libs/logger", () => ({
  pinoLogger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));
