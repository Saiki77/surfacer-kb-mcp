import type { Config } from "../config.js";
import * as searchKnowledge from "./search-knowledge.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";
import { s3HeadersToMetadata } from "../utils/metadata.js";
import { refreshPresence } from "../utils/presence.js";

export const schema = {
  name: "get_kb_context",
  description:
    "Get relevant knowledge base documents for the current task. Call this at the start of feature work to load architectural context, past decisions, and relevant documentation. Returns full document content for the top matches.",
  inputSchema: {
    type: "object" as const,
    properties: {
      taskDescription: {
        type: "string",
        description:
          "Brief description of the current task or feature being worked on",
      },
      maxDocuments: {
        type: "number",
        description:
          "Maximum number of context documents to return (default: 3)",
      },
    },
    required: ["taskDescription"],
  },
};

export async function execute(
  config: Config,
  args: { taskDescription: string; maxDocuments?: number }
): Promise<string> {
  const maxDocs = args.maxDocuments || 3;

  // Auto-update presence when loading context
  await refreshPresence(config, args.taskDescription);

  try {
    // Search for relevant documents
    const searchResult = await searchKnowledge.execute(config, {
      query: args.taskDescription,
      maxResults: maxDocs + 2, // Fetch a few extra in case some fail to read
    });

    // Extract document paths from search results
    const pathMatches = searchResult.matchAll(/\*\*Path:\*\*\s*(.+)/g);
    const paths: string[] = [];
    for (const match of pathMatches) {
      paths.push(match[1].trim());
    }

    if (paths.length === 0) {
      return `## KB Context\n\nNo relevant documents found for: "${args.taskDescription}"\n\nThe knowledge base may be empty or no documents match this task. Use \`list_documents\` to see available documents.`;
    }

    // Read full content of top documents
    const documents: string[] = [];
    for (const path of paths.slice(0, maxDocs)) {
      try {
        const { body, metadata } = await s3.getObject(config, path);
        const meta = s3HeadersToMetadata(metadata);

        const metaParts: string[] = [];
        if (meta.category) metaParts.push(`Category: ${meta.category}`);
        if (meta.tags) metaParts.push(`Tags: ${meta.tags.join(", ")}`);
        if (meta.modified) metaParts.push(`Modified: ${meta.modified}`);

        const header = metaParts.length > 0 ? `*${metaParts.join(" | ")}*\n\n` : "";
        documents.push(`### ${path}\n\n${header}${body}`);
      } catch {
        // Skip documents that fail to read
      }
    }

    if (documents.length === 0) {
      return `## KB Context\n\nFound matching documents but could not read them. Check S3 permissions.`;
    }

    return `## KB Context for: "${args.taskDescription}"\n\n${documents.length} relevant document(s) loaded.\n\n---\n\n${documents.join("\n\n---\n\n")}`;
  } catch (error) {
    return formatAwsError(error, "loading KB context");
  }
}
