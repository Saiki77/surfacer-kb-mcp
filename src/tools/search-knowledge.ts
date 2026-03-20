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

  // Fallback: keyword search across S3 documents
  try {
    const prefix = args.category ? `${args.category}/` : "";
    const items = await s3.listObjects(config, prefix, 100);

    if (items.length === 0) {
      return `No documents found${args.category ? ` in category '${args.category}'` : ""}. The knowledge base may be empty.`;
    }

    // Fetch content of each document and do keyword matching
    const queryTerms = args.query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scored: { key: string; score: number; snippet: string }[] = [];

    for (const item of items) {
      try {
        const { body } = await s3.getObject(config, item.key);
        const lower = body.toLowerCase();
        let score = 0;

        // Score by keyword matches
        for (const term of queryTerms) {
          const matches = lower.split(term).length - 1;
          score += matches;
        }

        // Also match on file path/name
        const keyLower = item.key.toLowerCase();
        for (const term of queryTerms) {
          if (keyLower.includes(term)) score += 3;
        }

        if (score > 0) {
          // Extract a relevant snippet
          const lines = body.split("\n").filter(l => l.trim());
          const snippetLines = lines.slice(0, 5).join("\n");
          scored.push({ key: item.key, score, snippet: snippetLines });
        }
      } catch {
        // Skip unreadable documents
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, maxResults);

    if (topResults.length === 0) {
      // No keyword matches, return full listing
      const listing = items
        .map(item => `- **${item.key}** (${(item.size / 1024).toFixed(1)} KB)`)
        .join("\n");
      return `## Knowledge Base Documents\n\n> **Note:** No keyword matches for "${args.query}". Showing all documents. Set KB_BEDROCK_KB_ID for semantic search.\n\n${listing}`;
    }

    const formatted = topResults
      .map((r, i) => `### Result ${i + 1} (relevance: ${r.score})\n**Path:** ${r.key}\n\n${r.snippet}`)
      .join("\n\n---\n\n");

    return `## Knowledge Base Search Results (keyword)\n\n> **Note:** Using keyword search. Set KB_BEDROCK_KB_ID for semantic search.\n\nQuery: "${args.query}"\n\n${formatted}`;
  } catch (error) {
    return formatAwsError(error, "searching documents");
  }
}
