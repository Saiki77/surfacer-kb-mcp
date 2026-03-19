import type { Config } from "../config.js";
import * as bedrock from "../aws/bedrock-client.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";

export const schema = {
  name: "search_knowledge",
  description:
    "Search the shared knowledge base for relevant documentation using semantic search. Returns document excerpts ranked by relevance. Falls back to file listing if Bedrock Knowledge Base is not configured.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Natural language search query",
      },
      category: {
        type: "string",
        description:
          "Optional category filter (e.g., 'decisions', 'architecture', 'processes', 'meeting-notes', 'context')",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return (default: 5)",
      },
    },
    required: ["query"],
  },
};

export async function execute(
  config: Config,
  args: { query: string; category?: string; maxResults?: number }
): Promise<string> {
  const maxResults = args.maxResults || 5;

  if (bedrock.isKnowledgeBaseAvailable(config)) {
    try {
      const results = await bedrock.retrieve(
        config,
        args.query,
        args.category,
        maxResults
      );

      if (results.length === 0) {
        return "No results found for your query. Try broadening your search terms.";
      }

      const formatted = results
        .map((r, i) => {
          const path = r.location.replace(
            `s3://${config.s3Bucket}/${config.s3Prefix}`,
            ""
          );
          return `### Result ${i + 1} (score: ${r.score.toFixed(3)})\n**Path:** ${path}\n\n${r.content}`;
        })
        .join("\n\n---\n\n");

      return `## Knowledge Base Search Results\n\nQuery: "${args.query}"\n\n${formatted}`;
    } catch (error) {
      if ((error as any).name === "ResourceNotFoundException") {
        // Fall through to S3 listing fallback
      } else {
        return formatAwsError(error, "knowledge base search");
      }
    }
  }

  // Fallback: list documents from S3
  try {
    const prefix = args.category ? `${args.category}/` : "";
    const items = await s3.listObjects(config, prefix, maxResults);

    if (items.length === 0) {
      return `No documents found${args.category ? ` in category '${args.category}'` : ""}. The knowledge base may be empty.`;
    }

    const listing = items
      .map(
        (item) =>
          `- **${item.key}** (${(item.size / 1024).toFixed(1)} KB, modified: ${item.lastModified})`
      )
      .join("\n");

    return `## Knowledge Base Documents\n\n> **Note:** Semantic search is unavailable (Bedrock Knowledge Base not configured). Showing file listing instead. Set KB_BEDROCK_KB_ID to enable semantic search.\n\nQuery: "${args.query}"\n\n${listing}`;
  } catch (error) {
    return formatAwsError(error, "listing documents");
  }
}
