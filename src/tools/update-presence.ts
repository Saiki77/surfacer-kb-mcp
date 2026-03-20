import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";
import { formatAwsError } from "../utils/errors.js";

export interface PresenceEntry {
  user: string;
  heartbeat: string;
  workingOn: string;
  openDocs: string[];
  status: "active" | "idle";
}

export const schema = {
  name: "update_presence",
  description:
    "Update your presence status so team members can see what you're working on. Automatically refreshed when using get_kb_context if KB_USER_NAME is set.",
  inputSchema: {
    type: "object" as const,
    properties: {
      user: {
        type: "string",
        description: "Your name/identifier",
      },
      workingOn: {
        type: "string",
        description: "Short description of current task",
      },
      openDocs: {
        type: "array",
        items: { type: "string" },
        description:
          "KB document paths currently open or being referenced",
      },
      status: {
        type: "string",
        enum: ["active", "idle"],
        description: "Current status. Defaults to 'active'.",
      },
    },
    required: ["user"],
  },
};

export async function execute(
  config: Config,
  args: {
    user: string;
    workingOn?: string;
    openDocs?: string[];
    status?: string;
  }
): Promise<string> {
  try {
    const entry: PresenceEntry = {
      user: args.user,
      heartbeat: new Date().toISOString(),
      workingOn: args.workingOn || "",
      openDocs: args.openDocs || [],
      status: (args.status as "active" | "idle") || "active",
    };

    await s3.putObject(
      config,
      `_presence/${args.user}.json`,
      JSON.stringify(entry, null, 2),
      {},
      "application/json"
    );

    return `Presence updated: **${args.user}** is ${entry.status}${entry.workingOn ? ` — working on: ${entry.workingOn}` : ""}.`;
  } catch (error) {
    return formatAwsError(error, "updating presence");
  }
}
