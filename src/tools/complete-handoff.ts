import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";
import type { Handoff } from "./create-handoff.js";

export const schema = {
  name: "complete_handoff",
  description:
    "Mark a claimed hand-off as completed. Optionally add completion notes about what was accomplished.",
  inputSchema: {
    type: "object" as const,
    properties: {
      id: {
        type: "string",
        description:
          "Handoff ID (full UUID or first 8 characters from list_handoffs)",
      },
      completionNotes: {
        type: "string",
        description: "What was accomplished, any remaining items",
      },
    },
    required: ["id"],
  },
};

export async function execute(
  config: Config,
  args: { id: string; completionNotes?: string }
): Promise<string> {
  try {
    const items = await s3.listObjects(config, "_handoffs/", 100);
    const match = items.find((item) => item.key.includes(args.id));

    if (!match) {
      return `Handoff not found: \`${args.id}\`.`;
    }

    const { body } = await s3.getObject(config, match.key);
    const handoff: Handoff = JSON.parse(body);

    if (handoff.status === "completed") {
      return `Handoff is already completed (${handoff.completedAt}).`;
    }

    handoff.status = "completed";
    handoff.completedAt = new Date().toISOString();
    if (args.completionNotes) {
      handoff.completionNotes = args.completionNotes;
    }

    await s3.putObject(
      config,
      match.key,
      JSON.stringify(handoff, null, 2),
      {},
      "application/json"
    );

    return `Handoff **${handoff.subject}** marked as completed.\n\n**From:** ${handoff.from} → **Claimed by:** ${handoff.claimedBy}\n**Duration:** ${handoff.createdAt} → ${handoff.completedAt}${args.completionNotes ? `\n**Notes:** ${args.completionNotes}` : ""}`;
  } catch (error) {
    return formatAwsError(error, "completing handoff");
  }
}
