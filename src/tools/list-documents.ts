import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";

export const schema = {
  name: "list_documents",
  description:
    "List documents in the shared knowledge base, optionally filtered by prefix/category.",
  inputSchema: {
    type: "object" as const,
    properties: {
      prefix: {
        type: "string",
        description:
          "Filter by path prefix (e.g., 'decisions/' to list all decision docs)",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of documents to return (default: 50)",
      },
    },
    required: [],
  },
};

export async function execute(
  config: Config,
  args: { prefix?: string; maxResults?: number }
): Promise<string> {
  try {
    const items = await s3.listObjects(
      config,
      args.prefix || "",
      args.maxResults || 50
    );

    if (items.length === 0) {
      return `No documents found${args.prefix ? ` under '${args.prefix}'` : ""}. The knowledge base may be empty.`;
    }

    const listing = items
      .map(
        (item) =>
          `- **${item.key}** (${(item.size / 1024).toFixed(1)} KB, modified: ${item.lastModified})`
      )
      .join("\n");

    return `## Knowledge Base Documents${args.prefix ? ` (${args.prefix})` : ""}\n\n${items.length} document(s) found:\n\n${listing}`;
  } catch (error) {
    return formatAwsError(error, "listing documents");
  }
}
