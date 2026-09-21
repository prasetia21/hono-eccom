import fs from "fs";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import { envSchema } from "@/config/env.ts";

const DEFAULT_KEY_FILE = path.resolve(process.cwd(), "storage", "google-service.json");

export class GoogleService {
  private auth: GoogleAuth;

  constructor() {
    const envPath = envSchema.GOOGLE_APPLICATION_CREDENTIALS;

    const keyFilePath = envPath
      ? path.isAbsolute(envPath)
        ? envPath
        : path.resolve(process.cwd(), envPath)
      : DEFAULT_KEY_FILE;

    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`google-service.json tidak ditemukan di: ${keyFilePath}`);
    }

    this.auth = new GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
  }

  async getAccessToken(): Promise<string> {
    const client = await this.auth.getClient();
    const tokenResponse = await client.getAccessToken();

    const token = tokenResponse?.token;

    if (!token) {
      throw new Error("Gagal mendapatkan access token dari GoogleAuth");
    }

    return token;
  }
}
