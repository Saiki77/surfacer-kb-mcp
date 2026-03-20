import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import type { Config } from "../config.js";

let client: S3Client | null = null;

function getClient(config: Config): S3Client {
  if (!client) {
    client = new S3Client({
      region: config.awsRegion,
      credentials: fromIni({ profile: config.awsProfile }),
    });
  }
  return client;
}

export async function getObject(
  config: Config,
  key: string
): Promise<{ body: string; metadata: Record<string, string> }> {
  const s3 = getClient(config);
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: config.s3Bucket,
      Key: config.s3Prefix + key,
    })
  );
  const body = (await response.Body?.transformToString()) || "";
  return { body, metadata: response.Metadata || {} };
}

export async function putObject(
  config: Config,
  key: string,
  body: string,
  metadata: Record<string, string>,
  contentType: string = "text/markdown"
): Promise<void> {
  const s3 = getClient(config);
  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: config.s3Prefix + key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    })
  );
}

export async function deleteObject(
  config: Config,
  key: string
): Promise<void> {
  const s3 = getClient(config);
  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.s3Bucket,
      Key: config.s3Prefix + key,
    })
  );
}

export interface S3ListItem {
  key: string;
  lastModified: string;
  size: number;
}

export async function listObjects(
  config: Config,
  prefix: string = "",
  maxResults: number = 50
): Promise<S3ListItem[]> {
  const s3 = getClient(config);
  const fullPrefix = config.s3Prefix + prefix;
  const items: S3ListItem[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.s3Bucket,
        Prefix: fullPrefix,
        MaxKeys: Math.min(maxResults - items.length, 1000),
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of response.Contents || []) {
      if (obj.Key && obj.Size && obj.Size > 0) {
        items.push({
          key: obj.Key.replace(config.s3Prefix, ""),
          lastModified: obj.LastModified?.toISOString() || "unknown",
          size: obj.Size,
        });
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken && items.length < maxResults);

  return items;
}

export async function headObject(
  config: Config,
  key: string
): Promise<{ exists: boolean; metadata: Record<string, string> }> {
  const s3 = getClient(config);
  try {
    const response = await s3.send(
      new HeadObjectCommand({
        Bucket: config.s3Bucket,
        Key: config.s3Prefix + key,
      })
    );
    return { exists: true, metadata: response.Metadata || {} };
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return { exists: false, metadata: {} };
    }
    throw error;
  }
}
