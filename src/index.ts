import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, type Config } from "./config.js";

import * as searchKnowledge from "./tools/search-knowledge.js";
import * as readDocument from "./tools/read-document.js";
import * as writeDocument from "./tools/write-document.js";
import * as listDocuments from "./tools/list-documents.js";
import * as deleteDocument from "./tools/delete-document.js";
import * as getContext from "./tools/get-context.js";
import * as processDocument from "./tools/process-document.js";
import * as createHandoff from "./tools/create-handoff.js";
import * as listHandoffs from "./tools/list-handoffs.js";
import * as claimHandoff from "./tools/claim-handoff.js";
import * as completeHandoff from "./tools/complete-handoff.js";
import * as updatePresence from "./tools/update-presence.js";
import * as getPresence from "./tools/get-presence.js";
import * as setupBedrock from "./tools/setup-bedrock.js";
import * as syncBedrock from "./tools/sync-bedrock.js";

const tools = [
  searchKnowledge,
  readDocument,
  writeDocument,
  listDocuments,
  deleteDocument,
  getContext,
  processDocument,
  createHandoff,
  listHandoffs,
  claimHandoff,
  completeHandoff,
  updatePresence,
  getPresence,
  setupBedrock,
  syncBedrock,
];

let config: Config;

try {
  config = loadConfig();
} catch (error: any) {
  console.error(`Configuration error: ${error.message}`);
  process.exit(1);
}

const server = new Server(
  {
    name: "knowledge-base",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((t) => ({
      name: t.schema.name,
      description: t.schema.description,
      inputSchema: t.schema.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const toolMap: Record<
    string,
    (config: Config, args: any) => Promise<string>
  > = {
    search_knowledge: searchKnowledge.execute,
    read_document: readDocument.execute,
    write_document: writeDocument.execute,
    list_documents: listDocuments.execute,
    delete_document: deleteDocument.execute,
    get_kb_context: getContext.execute,
    process_document: processDocument.execute,
    create_handoff: createHandoff.execute,
    list_handoffs: listHandoffs.execute,
    claim_handoff: claimHandoff.execute,
    complete_handoff: completeHandoff.execute,
    update_presence: updatePresence.execute,
    get_presence: getPresence.execute,
    setup_bedrock_kb: setupBedrock.execute,
    sync_bedrock: syncBedrock.execute,
  };

  const handler = toolMap[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await handler(config, args || {});
    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
