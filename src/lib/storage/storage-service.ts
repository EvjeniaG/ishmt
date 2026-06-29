import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { getStorageConfig } from "@/lib/storage/config";

let client: S3Client | null = null;

function getClient() {
  if (!client) {
    const cfg = getStorageConfig();
    client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKey,
        secretAccessKey: cfg.secretKey,
      },
      forcePathStyle: true,
    });
  }
  return client;
}

export class StorageService {
  static buildObjectKey(prefix: string, filename: string) {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${prefix}/${randomUUID()}/${safeName}`;
  }

  static async upload(key: string, body: Buffer, contentType: string) {
    const cfg = getStorageConfig();
    await getClient().send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  static async download(key: string): Promise<{ body: Buffer; contentType: string }> {
    const cfg = getStorageConfig();
    const response = await getClient().send(
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error("Skedari nuk u gjet në ruajtje.");
    }

    const bytes = await response.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: response.ContentType ?? "application/octet-stream",
    };
  }

  static async delete(key: string) {
    const cfg = getStorageConfig();
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      }),
    );
  }
}
