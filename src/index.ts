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

const tools = [
  searchKnowledge,
  readDocument,
  writeDocument,
  listDocuments,
  deleteDocument,
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
