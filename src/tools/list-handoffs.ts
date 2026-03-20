import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";
import type { Handoff } from "./create-handoff.js";

export const schema = {
  name: "list_handoffs",
  description:
    "List session hand-offs, optionally filtered by status and recipient. Shows open handoffs by default.",
  inputSchema: {
    type: "object" as const,
    properties: {
      status: {
        type: "string",
        enum: ["open", "claimed", "completed", "all"],
        description: "Filter by status. Defaults to 'open'.",
      },
      recipient: {
        type: "string",
        description:
          "Filter by recipient name. Omit to see all handoffs matching the status.",
      },
    },
    required: [],
  },
};

export async function execute(
  config: Config,
  args: { status?: string; recipient?: string }
): Promise<string> {
  try {
    const statusFilter = args.status || "open";
    const items = await s3.listObjects(config, "_handoffs/", 100);

    if (items.length === 0) {
      return "No handoffs found.";
    }

    const handoffs: Handoff[] = [];
    for (const item of items) {
      if (!item.key.endsWith(".json")) continue;
      try {
        const { body } = await s3.getObject(config, item.key);
        const handoff: Handoff = JSON.parse(body);
        handoffs.push(handoff);
      } catch {
        // Skip malformed entries
      }
    }

    let filtered = handoffs;
    if (statusFilter !== "all") {
      filtered = filtered.filter((h) => h.status === statusFilter);
    }
    if (args.recipient) {
      filtered = filtered.filter(
        (h) =>
          h.to === args.recipient ||
          h.to === "team" ||
          h.claimedBy === args.recipient
      );
    }

    // Sort: open first, then by date descending
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (filtered.length === 0) {
      return `No ${statusFilter === "all" ? "" : statusFilter + " "}handoffs found${args.recipient ? ` for ${args.recipient}` : ""}.`;
    }

    const lines = filtered.map((h) => {
      const age = getRelativeTime(h.createdAt);
      const status =
        h.status === "open"
          ? "🟢 Open"
          : h.status === "claimed"
            ? `🟡 Claimed by ${h.claimedBy}`
            : "✅ Completed";
      return `| \`${h.id.slice(0, 8)}\` | ${h.subject} | ${h.from} → ${h.to} | ${status} | ${age} |`;
    });

    return `## Handoffs (${statusFilter})\n\n| ID | Subject | From → To | Status | Created |\n|---|---|---|---|---|\n${lines.join("\n")}\n\nUse \`claim_handoff\` with the ID to pick one up.`;
  } catch (error) {
    return formatAwsError(error, "listing handoffs");
  }
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
