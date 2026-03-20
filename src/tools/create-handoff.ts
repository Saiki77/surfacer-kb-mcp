import { randomUUID } from "crypto";
import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";

export interface Handoff {
  id: string;
  from: string;
  to: string;
  status: "open" | "claimed" | "completed";
  createdAt: string;
  claimedAt: string | null;
  claimedBy: string | null;
  completedAt: string | null;
  subject: string;
  context: string;
  decisions: string[];
  blockers: string[];
  nextSteps: string[];
  relatedDocs: string[];
  notes: string;
  completionNotes: string | null;
}

export const schema = {
  name: "create_handoff",
  description:
    "Create a session hand-off for another team member to pick up. Captures work context, decisions made, blockers, and next steps. The recipient can claim and continue the work.",
  inputSchema: {
    type: "object" as const,
    properties: {
      from: {
        type: "string",
        description: "Who is creating this handoff (your name)",
      },
      to: {
        type: "string",
        description:
          "Who should pick this up (name or 'team' for anyone). Defaults to 'team'.",
      },
      subject: {
        type: "string",
        description: "Short summary of the work being handed off",
      },
      context: {
        type: "string",
        description:
          "What was being worked on — the full context someone needs to continue",
      },
      decisions: {
        type: "array",
        items: { type: "string" },
        description: "Key decisions made during this session",
      },
      blockers: {
        type: "array",
        items: { type: "string" },
        description: "Blockers or issues that need resolution",
      },
      nextSteps: {
        type: "array",
        items: { type: "string" },
        description: "What needs to happen next",
      },
      relatedDocs: {
        type: "array",
        items: { type: "string" },
        description:
          "KB document paths related to this work (e.g., 'architecture/sync-engine.md')",
      },
      notes: {
        type: "string",
        description: "Any additional notes or context (free-form markdown)",
      },
    },
    required: ["from", "subject", "context"],
  },
};

export async function execute(
  config: Config,
  args: {
    from: string;
    to?: string;
    subject: string;
    context: string;
    decisions?: string[];
    blockers?: string[];
    nextSteps?: string[];
    relatedDocs?: string[];
    notes?: string;
  }
): Promise<string> {
  try {
    const handoff: Handoff = {
      id: randomUUID(),
      from: args.from,
      to: args.to || "team",
      status: "open",
      createdAt: new Date().toISOString(),
      claimedAt: null,
      claimedBy: null,
      completedAt: null,
      subject: args.subject,
      context: args.context,
      decisions: args.decisions || [],
      blockers: args.blockers || [],
      nextSteps: args.nextSteps || [],
      relatedDocs: args.relatedDocs || [],
      notes: args.notes || "",
      completionNotes: null,
    };

    await s3.putObject(
      config,
      `_handoffs/${handoff.id}.json`,
      JSON.stringify(handoff, null, 2),
      {},
      "application/json"
    );

    const recipientText =
      handoff.to === "team" ? "the team" : `**${handoff.to}**`;

    return `Handoff created for ${recipientText}.\n\n**ID:** \`${handoff.id}\`\n**Subject:** ${handoff.subject}\n**Next steps:** ${handoff.nextSteps.length > 0 ? handoff.nextSteps.map((s) => `\n- ${s}`).join("") : "None specified"}\n\nThe recipient can claim this with \`claim_handoff\`.`;
  } catch (error) {
    return formatAwsError(error, "creating handoff");
  }
}
