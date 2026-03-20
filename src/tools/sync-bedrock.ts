import {
  BedrockAgentClient,
  StartIngestionJobCommand,
  GetIngestionJobCommand,
} from "@aws-sdk/client-bedrock-agent";
import { fromIni } from "@aws-sdk/credential-providers";
import type { Config } from "../config.js";
import { formatAwsError } from "../utils/errors.js";

export const schema = {
  name: "sync_bedrock",
  description:
    "Trigger a Bedrock Knowledge Base sync to index new or updated documents for semantic search. Run this after writing or updating KB documents.",
  inputSchema: {
    type: "object" as const,
    properties: {
      dataSourceId: {
        type: "string",
        description:
          "Bedrock data source ID. Reads from KB_DATA_SOURCE_ID env var if not provided.",
      },
    },
    required: [],
  },
};

export async function execute(
  config: Config,
  args: { dataSourceId?: string }
): Promise<string> {
  try {
    if (!config.bedrockKbId) {
      return "**Bedrock KB not configured.** Set `KB_BEDROCK_KB_ID` in your .mcp.json env block, or run `setup_bedrock_kb` first.";
    }

    const dataSourceId = args.dataSourceId || config.dataSourceId;
    if (!dataSourceId) {
      return "**Data source ID not configured.** Provide it via `dataSourceId` parameter or set `KB_DATA_SOURCE_ID` env var.";
    }

    const client = new BedrockAgentClient({
      region: config.awsRegion,
      credentials: fromIni({ profile: config.awsProfile }),
    });

    const response = await client.send(
      new StartIngestionJobCommand({
        knowledgeBaseId: config.bedrockKbId,
        dataSourceId,
      })
    );

    const job = response.ingestionJob;
    const jobId = job?.ingestionJobId || "unknown";
    const status = job?.status || "STARTING";

    return `Bedrock sync started.\n\n**Job ID:** \`${jobId}\`\n**Status:** ${status}\n\nIngestion typically takes 2-5 minutes. After completion, \`search_knowledge\` will return semantically relevant results.`;
  } catch (error) {
    return formatAwsError(error, "syncing Bedrock Knowledge Base");
  }
}
