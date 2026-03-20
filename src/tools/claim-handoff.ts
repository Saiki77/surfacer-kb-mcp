import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";
import type { Handoff } from "./create-handoff.js";

export const schema = {
  name: "claim_handoff",
  description:
    "Claim an open hand-off to continue the work. Returns the full context including decisions, blockers, next steps, and related documents.",
  inputSchema: {
    type: "object" as const,
    properties: {
      id: {
        type: "string",
        description:
          "Handoff ID (full UUID or first 8 characters from list_handoffs)",
      },
      claimedBy: {
        type: "string",
        description: "Your name (who is claiming this handoff)",
      },
    },
    required: ["id", "claimedBy"],
  },
};

export async function execute(
  config: Config,
  args: { id: string; claimedBy: string }
): Promise<string> {
  try {
    // Find the handoff — support short IDs
    const items = await s3.listObjects(config, "_handoffs/", 100);
    const match = items.find((item) => item.key.includes(args.id));

    if (!match) {
      return `Handoff not found: \`${args.id}\`. Use \`list_handoffs\` to see available handoffs.`;
    }

    const { body } = await s3.getObject(config, match.key);
    const handoff: Handoff = JSON.parse(body);

    if (handoff.status !== "open") {
      return `Cannot claim — handoff is already **${handoff.status}**${handoff.claimedBy ? ` by ${handoff.claimedBy}` : ""}.`;
    }

    // Update status
    handoff.status = "claimed";
    handoff.claimedAt = new Date().toISOString();
    handoff.claimedBy = args.claimedBy;

    await s3.putObject(
      config,
      match.key,
      JSON.stringify(handoff, null, 2),
      {},
      "application/json"
    );

    // Format the full handoff as readable markdown
    const sections: string[] = [
      `## Handoff: ${handoff.subject}`,
      `**From:** ${handoff.from} | **Created:** ${handoff.createdAt} | **Claimed by:** ${args.claimedBy}`,
      "",
      `### Context`,
      handoff.context,
    ];

    if (handoff.decisions.length > 0) {
      sections.push("", "### Decisions Made");
      handoff.decisions.forEach((d) => sections.push(`- ${d}`));
    }

    if (handoff.blockers.length > 0) {
      sections.push("", "### Blockers");
      handoff.blockers.forEach((b) => sections.push(`- ⚠️ ${b}`));
    }

    if (handoff.nextSteps.length > 0) {
      sections.push("", "### Next Steps");
      handoff.nextSteps.forEach((s) => sections.push(`- [ ] ${s}`));
    }

    if (handoff.relatedDocs.length > 0) {
      sections.push("", "### Related KB Documents");
      handoff.relatedDocs.forEach((d) => sections.push(`- \`${d}\``));
      sections.push(
        "",
        "*Use `read_document` to load any of these for context.*"
      );
    }

    if (handoff.notes) {
      sections.push("", "### Notes", handoff.notes);
    }

    return sections.join("\n");
  } catch (error) {
    return formatAwsError(error, "claiming handoff");
  }
}
