import {
  BedrockAgentClient,
  CreateKnowledgeBaseCommand,
  CreateDataSourceCommand,
  StartIngestionJobCommand,
  ListKnowledgeBasesCommand,
  ListDataSourcesCommand,
} from "@aws-sdk/client-bedrock-agent";
import { fromIni } from "@aws-sdk/credential-providers";
import type { Config } from "../config.js";
import { formatAwsError } from "../utils/errors.js";

export const schema = {
  name: "setup_bedrock_kb",
  description:
    "Create an Amazon Bedrock Knowledge Base pointing at the S3 knowledge base bucket. This enables semantic search across all KB documents. Requires an IAM role with S3 access. Only run this once — subsequent calls will detect the existing KB.",
  inputSchema: {
    type: "object" as const,
    properties: {
      kbName: {
        type: "string",
        description:
          "Name for the knowledge base. Defaults to 'surfacer-knowledge-base'.",
      },
      roleArn: {
        type: "string",
        description:
          "IAM role ARN for Bedrock to access S3. Must have s3:GetObject and s3:ListBucket permissions on the KB bucket. Can also be set via KB_BEDROCK_ROLE_ARN env var.",
      },
    },
    required: [],
  },
};

export async function execute(
  config: Config,
  args: { kbName?: string; roleArn?: string }
): Promise<string> {
  const kbName = args.kbName || "surfacer-knowledge-base";
  const roleArn = args.roleArn || config.bedrockRoleArn;

  if (!roleArn) {
    return `**Missing IAM Role ARN.** Provide it via the \`roleArn\` parameter or set \`KB_BEDROCK_ROLE_ARN\` env var.\n\nThe role needs:\n- \`s3:GetObject\` on \`arn:aws:s3:::${config.s3Bucket}/${config.s3Prefix}*\`\n- \`s3:ListBucket\` on \`arn:aws:s3:::${config.s3Bucket}\`\n- Trust policy for \`bedrock.amazonaws.com\``;
  }

  try {
    const client = new BedrockAgentClient({
      region: config.awsRegion,
      credentials: fromIni({ profile: config.awsProfile }),
    });

    // Check if KB already exists
    const listResponse = await client.send(
      new ListKnowledgeBasesCommand({ maxResults: 50 })
    );
    const existing = listResponse.knowledgeBaseSummaries?.find(
      (kb) => kb.name === kbName
    );

    let kbId: string;
    let dataSourceId: string;

    if (existing) {
      kbId = existing.knowledgeBaseId!;

      // Find existing data source
      const dsResponse = await client.send(
        new ListDataSourcesCommand({
          knowledgeBaseId: kbId,
          maxResults: 10,
        })
      );
      const existingDs = dsResponse.dataSourceSummaries?.[0];
      if (existingDs) {
        dataSourceId = existingDs.dataSourceId!;
      } else {
        // Create data source for existing KB
        const dsResult = await createDataSource(
          client,
          kbId,
          config
        );
        dataSourceId = dsResult;
      }
    } else {
      // Create new KB
      const createResponse = await client.send(
        new CreateKnowledgeBaseCommand({
          name: kbName,
          description:
            "Surfacer shared knowledge base — architecture decisions, processes, and context",
          roleArn,
          knowledgeBaseConfiguration: {
            type: "VECTOR",
            vectorKnowledgeBaseConfiguration: {
              embeddingModelArn: `arn:aws:bedrock:${config.awsRegion}::foundation-model/amazon.titan-embed-text-v2:0`,
            },
          },
          storageConfiguration: {
            type: "OPENSEARCH_SERVERLESS",
            opensearchServerlessConfiguration: {
              collectionArn: "", // Will be auto-created by Bedrock
              vectorIndexName: "bedrock-knowledge-base-default-index",
              fieldMapping: {
                vectorField: "bedrock-knowledge-base-default-vector",
                textField: "AMAZON_BEDROCK_TEXT_CHUNK",
                metadataField: "AMAZON_BEDROCK_METADATA",
              },
            },
          },
        })
      );

      kbId = createResponse.knowledgeBase?.knowledgeBaseId || "";

      // Create data source
      dataSourceId = await createDataSource(client, kbId, config);
    }

    // Start initial ingestion
    const ingestionResponse = await client.send(
      new StartIngestionJobCommand({
        knowledgeBaseId: kbId,
        dataSourceId,
      })
    );

    const jobId =
      ingestionResponse.ingestionJob?.ingestionJobId || "unknown";

    return `## Bedrock Knowledge Base ${existing ? "Found" : "Created"}

**KB ID:** \`${kbId}\`
**Data Source ID:** \`${dataSourceId}\`
**Ingestion Job:** \`${jobId}\` (started)

### Next Steps

1. Add these to your \`.mcp.json\` env block:
   \`\`\`
   "KB_BEDROCK_KB_ID": "${kbId}",
   "KB_DATA_SOURCE_ID": "${dataSourceId}"
   \`\`\`

2. Redeploy: \`bash scripts/deploy-local.sh\`

3. After ingestion completes (~2-5 min), \`search_knowledge\` will use semantic search automatically.

4. To re-index after adding docs, call \`sync_bedrock\`.`;
  } catch (error) {
    return formatAwsError(error, "setting up Bedrock Knowledge Base");
  }
}

async function createDataSource(
  client: BedrockAgentClient,
  kbId: string,
  config: Config
): Promise<string> {
  const dsResponse = await client.send(
    new CreateDataSourceCommand({
      knowledgeBaseId: kbId,
      name: "s3-knowledge-base",
      description: "S3-backed knowledge base documents",
      dataSourceConfiguration: {
        type: "S3",
        s3Configuration: {
          bucketArn: `arn:aws:s3:::${config.s3Bucket}`,
          inclusionPrefixes: [config.s3Prefix],
        },
      },
      vectorIngestionConfiguration: {
        chunkingConfiguration: {
          chunkingStrategy: "HIERARCHICAL",
          hierarchicalChunkingConfiguration: {
            levelConfigurations: [
              { maxTokens: 1500 }, // Parent chunks (H1/H2 sections)
              { maxTokens: 300 },  // Child chunks (H3/paragraphs)
            ],
            overlapTokens: 60,
          },
        },
      },
    })
  );

  return dsResponse.dataSource?.dataSourceId || "";
}
