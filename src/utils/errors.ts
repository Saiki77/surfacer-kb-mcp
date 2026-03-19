export function formatAwsError(error: unknown, operation: string): string {
  if (error instanceof Error) {
    const name = (error as any).name || error.constructor.name;

    switch (name) {
      case "CredentialsProviderError":
      case "ExpiredTokenException":
        return `AWS credentials error: ${error.message}. Ensure ~/.aws/credentials has the correct profile configured.`;

      case "NoSuchKey":
        return `Document not found. The specified path does not exist in the knowledge base.`;

      case "NoSuchBucket":
        return `S3 bucket not found. Check your KB_S3_BUCKET configuration or run the setup script.`;

      case "ResourceNotFoundException":
        return `Bedrock Knowledge Base not found. Check your KB_BEDROCK_KB_ID configuration or run the setup script.`;

      case "AccessDeniedException":
        return `Access denied for ${operation}. Ensure your AWS IAM user/role has the required permissions.`;

      default:
        return `Error during ${operation}: ${error.message}`;
    }
  }
  return `Unknown error during ${operation}: ${String(error)}`;
}
