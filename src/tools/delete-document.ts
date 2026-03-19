import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";

export const schema = {
  name: "delete_document",
  description:
    "Delete a document from the shared knowledge base. The document will be removed from S3 and will no longer appear in search results after the next KB sync.",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description:
          "Document path relative to the knowledge base root (e.g., 'decisions/api-design.md')",
      },
    },
    required: ["path"],
  },
};

export async function execute(
  config: Config,
  args: { path: string }
): Promise<string> {
  try {
    const { exists } = await s3.headObject(config, args.path);
    if (!exists) {
      return `Document not found at '${args.path}'. Use list_documents to see available documents.`;
    }

    await s3.deleteObject(config, args.path);
    return `Deleted document at **${args.path}**. It will be removed from search results after the next KB sync.`;
  } catch (error) {
    return formatAwsError(error, `deleting document '${args.path}'`);
  }
}
