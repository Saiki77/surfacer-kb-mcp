export interface Config {
  s3Bucket: string;
  bedrockKbId: string | null;
  awsProfile: string;
  awsRegion: string;
  s3Prefix: string;
}

export function loadConfig(): Config {
  const s3Bucket = process.env.KB_S3_BUCKET;
  if (!s3Bucket) {
    throw new Error(
      "KB_S3_BUCKET environment variable is required. Set it in your .mcp.json env block."
    );
  }

  return {
    s3Bucket,
    bedrockKbId: process.env.KB_BEDROCK_KB_ID || null,
    awsProfile: process.env.KB_AWS_PROFILE || "default",
    awsRegion: process.env.KB_AWS_REGION || "eu-central-1",
    s3Prefix: process.env.KB_S3_PREFIX || "knowledge-base/",
  };
}
