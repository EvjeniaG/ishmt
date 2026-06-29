export type StorageConfig = {
  provider: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  useSsl: boolean;
};

export function getStorageConfig(): StorageConfig {
  return {
    provider: process.env.STORAGE_PROVIDER ?? "minio",
    endpoint: process.env.STORAGE_ENDPOINT ?? "http://localhost:9000",
    accessKey: process.env.STORAGE_ACCESS_KEY ?? "ishmtt_minio",
    secretKey: process.env.STORAGE_SECRET_KEY ?? "ishmtt_minio_secret",
    bucket: process.env.STORAGE_BUCKET ?? "ishmtt-documents",
    region: process.env.STORAGE_REGION ?? "us-east-1",
    useSsl: process.env.STORAGE_USE_SSL === "true",
  };
}

export function isStorageConfigured() {
  const cfg = getStorageConfig();
  return Boolean(cfg.endpoint && cfg.accessKey && cfg.secretKey && cfg.bucket);
}
