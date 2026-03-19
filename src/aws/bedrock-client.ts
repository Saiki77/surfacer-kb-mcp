import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { fromIni } from "@aws-sdk/credential-providers";
import type { Config } from "../config.js";

let client: BedrockAgentRuntimeClient | null = null;
let knowledgeBaseAvailable: boolean | null = null;

function getClient(config: Config): BedrockAgentRuntimeClient {
  if (!client) {
    client = new BedrockAgentRuntimeClient({
      region: config.awsRegion,
      credentials: fromIni({ profile: config.awsProfile }),
    });
  }
  return client;
}

export interface RetrievalResult {
  content: string;
  location: string;
  score: number;
}

export function isKnowledgeBaseAvailable(config: Config): boolean {
  if (!config.bedrockKbId) return false;
  if (knowledgeBaseAvailable === false) return false;
  return true;
}

export async function retrieve(
  config: Config,
  query: string,
  category?: string,
  maxResults: number = 5
): Promise<RetrievalResult[]> {
  if (!config.bedrockKbId) {
    throw new Error("Bedrock Knowledge Base ID not configured");
  }

  const bedrock = getClient(config);

  const retrievalConfiguration: any = {
    vectorSearchConfiguration: {
      numberOfResults: maxResults,
    },
  };

  if (category) {
    retrievalConfiguration.vectorSearchConfiguration.filter = {
      equals: {
        key: "category",
        value: category,
      },
    };
  }

  try {
    const response = await bedrock.send(
      new RetrieveCommand({
        knowledgeBaseId: config.bedrockKbId,
        retrievalQuery: { text: query },
        retrievalConfiguration,
      })
    );

    knowledgeBaseAvailable = true;

    return (response.retrievalResults || []).map((result) => ({
      content: result.content?.text || "",
      location:
        result.location?.s3Location?.uri ||
        result.location?.type ||
        "unknown",
      score: result.score || 0,
    }));
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      knowledgeBaseAvailable = false;
      throw error;
    }
    throw error;
  }
}
