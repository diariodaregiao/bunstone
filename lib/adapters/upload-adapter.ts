import { s3, S3Client, type S3Options } from "bun";

export type S3UploadBody = Parameters<S3Client["write"]>[1];

export type MinioConfig = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

export type S3UploadParams = {
  path: string;
  body: S3UploadBody;
  contentType?: string;
  acl?: S3Options["acl"];
};

export class UploadAdatper {
  private readonly client: S3Client;

  constructor(config?: MinioConfig) {
    this.client = config
      ? new S3Client({
          endpoint: config.endpoint,
          bucket: config.bucket,
          accessKeyId: config.accessKey,
          secretAccessKey: config.secretKey,
        })
      : s3;
  }

  async upload(params: S3UploadParams): Promise<string> {
    const key = normalizeS3Key(params.path);
    await this.client.write(key, params.body, {
      type: params.contentType,
      acl: params.acl,
    });
    return toPublicBucketPath(key);
  }

  async exists(path: string): Promise<boolean> {
    const key = normalizeS3Key(path);
    return this.client.exists(key);
  }

  async remove(path: string): Promise<void> {
    const key = normalizeS3Key(path);
    await this.client.delete(key);
  }
}

function normalizeS3Key(path: string): string {
  const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "");
  if (normalized.length === 0) {
    throw new Error("S3 object path cannot be empty.");
  }
  return normalized.replace(/\/{2,}/g, "/");
}

function toPublicBucketPath(key: string): string {
  return `/${normalizeS3Key(key)}`;
}
