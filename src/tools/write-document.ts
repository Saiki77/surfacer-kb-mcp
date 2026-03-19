import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";
import {
  parseFrontmatter,
  buildDocumentContent,
  metadataToS3Headers,
  type DocumentMetadata,
} from "../utils/metadata.js";

export const schema = {
  name: "write_document",
  description:
    "Create or update a document in the shared knowledge base. Automatically manages YAML frontmatter metadata. After writing, trigger a Bedrock KB sync to make the document searchable.",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description:
          "Document path relative to the knowledge base root (e.g., 'decisions/api-design.md')",
      },
      content: {
        type: "string",
        description:
          "Document content (markdown). Frontmatter will be added/updated automatically.",
      },
      author: {
        type: "string",
        description: "Author name",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Document tags for categorization",
      },
    },
    required: ["path", "content"],
  },
};

export async function execute(
  config: Config,
  args: { path: string; content: string; author?: string; tags?: string[] }
): Promise<string> {
  try {
    const now = new Date().toISOString();

    // Check if document already exists to preserve created date
    const existing = await s3.headObject(config, args.path);

    // Parse content in case it already has frontmatter
    const { metadata: existingFrontmatter, body } = parseFrontmatter(
      args.content
    );

    // Derive category from path
    const category = args.path.includes("/")
      ? args.path.split("/")[0]
      : undefined;

    // Build metadata
    const metadata: DocumentMetadata = {
      ...existingFrontmatter,
      title:
        existingFrontmatter.title ||
        args.path.split("/").pop()?.replace(".md", "") ||
        args.path,
      author: args.author || existingFrontmatter.author,
      created: existing.exists
        ? existing.metadata["created"] || now
        : now,
      modified: now,
      tags: args.tags || existingFrontmatter.tags,
      category: category || existingFrontmatter.category,
    };

    const fullContent = buildDocumentContent(body, metadata);
    const s3Headers = metadataToS3Headers(metadata);

    await s3.putObject(config, args.path, fullContent, s3Headers);

    const action = existing.exists ? "Updated" : "Created";
    return `${action} document at **${args.path}**.\n\nTo make this document searchable via semantic search, trigger a knowledge base sync with the /kb-sync command.`;
  } catch (error) {
    return formatAwsError(error, `writing document '${args.path}'`);
  }
}
