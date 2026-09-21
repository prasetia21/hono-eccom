import crypto from "crypto";
import { envSchema } from "@/config/env.ts";

export const md5 = (data: string) => crypto.createHash("md5").update(data).digest("hex");
export const sha256 = (data: string) => crypto.createHash("sha256").update(data).digest("hex");

const getKey = (): Buffer => {
  const key = envSchema.APP_KEY;

  if (!key) {
    throw new Error("APP_KEY tidak ditemukan di environment variable.");
  }

  if (key.startsWith("base64:")) {
    return Buffer.from(key.slice(7), "base64");
  }

  const keyBuffer = Buffer.from(key, "utf8");

  if (keyBuffer.length !== 32) {
    throw new Error(
      `APP_KEY harus memiliki panjang tepat 32 karakter (saat ini ${keyBuffer.length} byte).`,
    );
  }

  return keyBuffer;
};

export const encryptString = (value: string): string => {
  const key = getKey();

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(value, "utf8", "base64");
  encrypted += cipher.final("base64");

  const ivBase64 = iv.toString("base64");
  const mac = crypto
    .createHmac("sha256", key)
    .update(ivBase64 + encrypted)
    .digest("hex");

  const jsonPayload = JSON.stringify({
    iv: ivBase64,
    value: encrypted,
    mac,
    tag: "",
  });

  return Buffer.from(jsonPayload).toString("base64");
};

export const decryptString = (encryptedPayload: string): string => {
  try {
    const key = getKey();
    const jsonString = Buffer.from(encryptedPayload, "base64").toString("utf8");
    const parsed = JSON.parse(jsonString);
    const { iv, value, mac } = parsed;

    if (!iv || !value || !mac) {
      throw new Error("Format payload tidak valid.");
    }

    const calculatedMac = crypto
      .createHmac("sha256", key)
      .update(iv + value)
      .digest("hex");

    const isValidMac = crypto.timingSafeEqual(
      Buffer.from(calculatedMac, "hex"),
      Buffer.from(mac, "hex"),
    );

    if (!isValidMac) {
      throw new Error("MAC tidak valid. Data mungkin telah dimanipulasi.");
    }

    const ivBuffer = Buffer.from(iv, "base64");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, ivBuffer);

    let decrypted = decipher.update(value, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Gagal mendekripsi data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
