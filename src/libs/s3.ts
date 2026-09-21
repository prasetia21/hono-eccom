import { randomBytes } from "node:crypto";
import { envSchema } from "@/config/env";
import { pinoLogger } from "@/libs/logger";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

let s3Client: S3Client;

export interface UploadFileOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  generateUniqueName?: boolean;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

const s3Config: S3ClientConfig = {
  region: envSchema.AWS_REGION,
  credentials: {
    accessKeyId: envSchema.AWS_ACCESS_KEY_ID,
    secretAccessKey: envSchema.AWS_SECRET_ACCESS_KEY,
  },
  ...(envSchema.AWS_S3_ENDPOINT && { endpoint: envSchema.AWS_S3_ENDPOINT }),
  forcePathStyle: envSchema.AWS_S3_FORCE_PATH_STYLE,
};

export const getS3Client = (): S3Client => {
  if (!s3Client) {
    s3Client = new S3Client(s3Config);
  }
  return s3Client;
};

export const uploadToS3 = async (
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string,
  metadata?: Record<string, string>,
) => {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: envSchema.AWS_S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  return await client.send(command);
};

export const getFromS3 = async (key: string) => {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: envSchema.AWS_S3_BUCKET,
    Key: key,
  });

  return await client.send(command);
};

export const deleteFromS3 = async (key: string) => {
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: envSchema.AWS_S3_BUCKET,
    Key: key,
  });

  return await client.send(command);
};

export const checkS3ObjectExists = async (key: string): Promise<boolean> => {
  const client = getS3Client();

  try {
    const command = new HeadObjectCommand({
      Bucket: envSchema.AWS_S3_BUCKET,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch {
    return false;
  }
};

export const listS3Objects = async (prefix?: string, maxKeys = 1000) => {
  const client = getS3Client();

  const command = new ListObjectsV2Command({
    Bucket: envSchema.AWS_S3_BUCKET,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  return await client.send(command);
};

export const getS3ObjectUrl = (key: string): string => {
  if (envSchema.AWS_S3_ENDPOINT) {
    return `${envSchema.AWS_S3_ENDPOINT}/${envSchema.AWS_S3_BUCKET}/${key}`;
  }
  return `https://${envSchema.AWS_S3_BUCKET}.s3.${envSchema.AWS_REGION}.amazonaws.com/${key}`;
};

export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const random = randomBytes(8).toString("hex");
  const extension = originalName.split(".").pop();
  const nameWithoutExt = extension ? originalName.replace(`.${extension}`, "") : originalName;
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, "-");
  const finalExtension = extension ? `.${extension}` : "";
  return `${sanitized}-${timestamp}-${random}${finalExtension}`;
};

export const uploadFile = async (
  file: Buffer | Uint8Array | string,
  originalName: string,
  options: UploadFileOptions = {},
): Promise<UploadResult> => {
  const {
    folder = "uploads",
    filename,
    contentType,
    metadata,
    generateUniqueName = true,
  } = options;

  const finalFilename = filename
    ? filename
    : generateUniqueName
      ? generateUniqueFilename(originalName)
      : originalName;

  const key = folder ? `${folder}/${finalFilename}` : finalFilename;

  const result = await uploadToS3(key, file, contentType, metadata);

  pinoLogger.info({ key, bucket: result.$metadata }, "File uploaded to S3");

  const size =
    typeof file === "string"
      ? Buffer.byteLength(file)
      : file instanceof Buffer
        ? file.length
        : file.byteLength;

  return {
    key,
    url: getS3ObjectUrl(key),
    size,
  };
};

export const downloadFile = async (key: string): Promise<Buffer> => {
  const result = await getFromS3(key);

  if (!result.Body) {
    throw new Error("File body is empty");
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);

  pinoLogger.info({ key }, "File downloaded from S3");

  return buffer;
};

export const deleteFile = async (key: string): Promise<boolean> => {
  try {
    await deleteFromS3(key);
    pinoLogger.info({ key }, "File deleted from S3");
    return true;
  } catch (err) {
    pinoLogger.error({ error: err, key }, "Failed to delete file from S3");
    return false;
  }
};

export const fileExists = async (key: string): Promise<boolean> => {
  try {
    return await checkS3ObjectExists(key);
  } catch (err) {
    pinoLogger.error({ error: err, key }, "Failed to check file existence in S3");
    return false;
  }
};

export const getFileUrl = (key: string): string => {
  return getS3ObjectUrl(key);
};

export const uploadMultipleFiles = async (
  files: Array<{
    buffer: Buffer | Uint8Array | string;
    name: string;
    contentType?: string;
  }>,
  options: Omit<UploadFileOptions, "filename"> = {},
): Promise<UploadResult[]> => {
  const uploadPromises = files.map((file) =>
    uploadFile(file.buffer, file.name, {
      ...options,
      contentType: file.contentType,
    }),
  );

  return await Promise.all(uploadPromises);
};

export const checkS3Connection = async (): Promise<{
  status: string;
  error: string | null;
}> => {
  try {
    const client = getS3Client();
    const command = new ListObjectsV2Command({
      Bucket: envSchema.AWS_S3_BUCKET,
      MaxKeys: 1,
    });
    await client.send(command);
    return { status: "connected", error: null };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

export const closeS3Client = (): void => {
  if (s3Client) {
    s3Client.destroy();
    pinoLogger.info("S3 client closed successfully");
  }
};
