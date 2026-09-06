import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getServerEnv } from "../env";

interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  publicBaseUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
}

interface PutStorageObjectInput {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}

let client: S3Client | null = null;
let cachedConfigKey: string | null = null;

export function isStorageConfigured() {
  return Boolean(readStorageConfig());
}

export function assertStorageConfigured(): StorageConfig {
  const config = readStorageConfig();

  if (!config) {
    throw Object.assign(new Error("Storage ist nicht konfiguriert."), {
      status: 503,
      code: "service-unavailable"
    });
  }

  return config;
}

export async function putStorageObject(input: PutStorageObjectInput) {
  const config = assertStorageConfigured();
  const s3 = getStorageClient(config);

  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType
    })
  );

  return {
    objectKey: input.key,
    publicUrl: await buildStorageReadUrl(input.key, config)
  };
}

export async function deleteStorageObject(objectKey: string) {
  const config = assertStorageConfigured();
  const s3 = getStorageClient(config);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: objectKey
    })
  );
}

export function buildStoragePublicUrl(objectKey: string, config = assertStorageConfigured()) {
  const normalizedBaseUrl = config.publicBaseUrl.endsWith("/")
    ? config.publicBaseUrl.slice(0, -1)
    : config.publicBaseUrl;

  return `${normalizedBaseUrl}/${objectKey}`;
}

export async function getStorageReadUrl(objectKey: string) {
  return buildStorageReadUrl(objectKey, assertStorageConfigured());
}

export function sanitizeStorageFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : "upload";
}

function getStorageClient(config: StorageConfig) {
  const nextConfigKey = JSON.stringify(config);

  if (client && cachedConfigKey === nextConfigKey) {
    return client;
  }

  client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
  cachedConfigKey = nextConfigKey;

  return client;
}

async function buildStorageReadUrl(objectKey: string, config: StorageConfig) {
  return getSignedUrl(
    getStorageClient(config),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey
    }),
    { expiresIn: 15 * 60 }
  );
}

function readStorageConfig(): StorageConfig | null {
  const env = getServerEnv();

  if (
    !env.s3Endpoint ||
    !env.s3Region ||
    !env.s3Bucket ||
    !env.s3PublicBaseUrl ||
    !env.s3AccessKey ||
    !env.s3SecretKey
  ) {
    return null;
  }

  return {
    endpoint: env.s3Endpoint,
    region: env.s3Region,
    bucket: env.s3Bucket,
    publicBaseUrl: env.s3PublicBaseUrl,
    accessKeyId: env.s3AccessKey,
    secretAccessKey: env.s3SecretKey
  };
}
