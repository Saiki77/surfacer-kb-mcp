import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";
import type { PresenceEntry } from "./update-presence.js";

export const schema = {
  name: "get_presence",
  description:
    "See who on the team is currently active, what they're working on, and which KB documents they have open. Entries older than the TTL are shown as stale.",
  inputSchema: {
    type: "object" as const,
    properties: {
      staleTtlMinutes: {
        type: "number",
        description:
          "Minutes after which a presence entry is considered stale. Defaults to 5.",
      },
    },
    required: [],
  },
};

export async function execute(
  config: Config,
  args: { staleTtlMinutes?: number }
): Promise<string> {
  try {
    const ttl = (args.staleTtlMinutes || 5) * 60 * 1000;
    const items = await s3.listObjects(config, "_presence/", 50);

    if (items.length === 0) {
      return "No team presence data found. Use `update_presence` to share your status.";
    }

    const now = Date.now();
    const active: PresenceEntry[] = [];
    const stale: (PresenceEntry & { lastSeenAgo: string })[] = [];

    for (const item of items) {
      if (!item.key.endsWith(".json")) continue;
      try {
        const { body } = await s3.getObject(config, item.key);
        const entry: PresenceEntry = JSON.parse(body);
        const age = now - new Date(entry.heartbeat).getTime();

        if (age < ttl) {
          active.push(entry);
        } else {
          stale.push({ ...entry, lastSeenAgo: formatAge(age) });
        }
      } catch {
        // Skip malformed
      }
    }

    const sections: string[] = [];

    if (active.length > 0) {
      sections.push("## Active Team Members\n");
      for (const e of active) {
        const statusIcon = e.status === "active" ? "🟢" : "💤";
        sections.push(`${statusIcon} **${e.user}**${e.workingOn ? ` — ${e.workingOn}` : ""}`);
        if (e.openDocs.length > 0) {
          sections.push(`  Open: ${e.openDocs.map((d) => `\`${d}\``).join(", ")}`);
        }
      }
    } else {
      sections.push("No team members currently active.");
    }

    if (stale.length > 0) {
      sections.push("\n## Recently Active\n");
      for (const e of stale) {
        sections.push(`⚪ **${e.user}** — last seen ${e.lastSeenAgo}${e.workingOn ? ` (was working on: ${e.workingOn})` : ""}`);
      }
    }

    return sections.join("\n");
  } catch (error) {
    return formatAwsError(error, "getting team presence");
  }
}

function formatAge(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
