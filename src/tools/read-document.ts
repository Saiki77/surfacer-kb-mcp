import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";
import { s3HeadersToMetadata } from "../utils/metadata.js";

export const schema = {
  name: "read_document",
  description:
    "Read a specific document from the shared knowledge base by its path. Returns the full document content with metadata.",
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
    const { body, metadata } = await s3.getObject(config, args.path);
    const meta = s3HeadersToMetadata(metadata);

    const metaLines: string[] = [];
    if (meta.author) metaLines.push(`**Author:** ${meta.author}`);
    if (meta.created) metaLines.push(`**Created:** ${meta.created}`);
    if (meta.modified) metaLines.push(`**Modified:** ${meta.modified}`);
    if (meta.tags) metaLines.push(`**Tags:** ${meta.tags.join(", ")}`);
    if (meta.category) metaLines.push(`**Category:** ${meta.category}`);

    const header =
      metaLines.length > 0
        ? `## Document: ${args.path}\n\n${metaLines.join(" | ")}\n\n---\n\n`
        : `## Document: ${args.path}\n\n`;

    return header + body;
  } catch (error) {
    return formatAwsError(error, `reading document '${args.path}'`);
  }
}
