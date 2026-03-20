import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";
import {
  parseFrontmatter,
  buildDocumentContent,
  metadataToS3Headers,
  s3HeadersToMetadata,
} from "../utils/metadata.js";

export const schema = {
  name: "process_document",
  description:
    "Process a knowledge base document: normalize formatting, suggest categorization, and identify cross-references. Returns the document content with processing instructions. Use this to refactor and organize KB documents. After processing, write the result back with write_document.",
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
    // Read the document
    const { body, metadata: s3Meta } = await s3.getObject(config, args.path);
    const meta = s3HeadersToMetadata(s3Meta);
    const { metadata: fmMeta, body: docBody } = parseFrontmatter(body);
    const merged = { ...meta, ...fmMeta };

    // List all other documents for cross-reference context
    const allItems = await s3.listObjects(config, "", 200);
    const otherDocs = allItems
      .filter((item) => item.key !== args.path && item.key.endsWith(".md"))
      .map((item) => item.key);

    // Build the processing prompt for Claude to act on
    const currentCategory = args.path.includes("/")
      ? args.path.split("/")[0]
      : "uncategorized";
    const filename = args.path.split("/").pop() || args.path;

    return `## Document to Process: ${args.path}

**Current category:** ${currentCategory}
**Current tags:** ${merged.tags?.join(", ") || "none"}
**Last AI processed:** ${merged.aiProcessed || "never"}

### Existing KB Documents (for cross-references)
${otherDocs.map((d) => `- ${d}`).join("\n") || "No other documents"}

### Document Content
\`\`\`markdown
${docBody}
\`\`\`

---

### Processing Instructions

Please process this document by doing ALL of the following:

1. **Normalize formatting**: Ensure single H1 as title, logical H2/H3 hierarchy, consistent spacing, clean markdown.

2. **Categorize**: Determine the best category folder:
   - \`decisions/\` — Architecture decisions, ADRs, "why we chose X"
   - \`architecture/\` — System design, component diagrams, API specs
   - \`processes/\` — Runbooks, deployment guides, code review guidelines
   - \`meeting-notes/\` — Meeting summaries, action items, standups
   - \`context/\` — Tech stack, glossary, onboarding, general reference

3. **Cross-reference**: Add a "## Related Documents" section at the bottom with \`[[document-name]]\` wiki-links to genuinely related documents from the list above. Use filenames without extension or folder prefix.

4. **Tags**: Suggest appropriate tags based on content.

5. **Do NOT remove any content**. Only reorganize, normalize, and add cross-references.

After processing, write the result back using \`write_document\` with:
- **path**: \`{suggested-category}/${filename}\` (move if category changed, otherwise keep current path)
- **content**: The processed markdown
- **tags**: Your suggested tags

The document's \`aiProcessed\` timestamp will be set automatically.`;
  } catch (error) {
    return formatAwsError(error, `processing document '${args.path}'`);
  }
}
