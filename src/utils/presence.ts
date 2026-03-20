import type { Config } from "../config.js";
import * as s3 from "../aws/s3-client.js";

/**
 * Auto-refresh presence as a side-effect of normal tool usage.
 * Only updates if KB_USER_NAME is configured. Silently fails.
 */
export async function refreshPresence(
  config: Config,
  workingOn?: string
): Promise<void> {
  if (!config.userName) return;

  try {
    const entry = {
      user: config.userName,
      heartbeat: new Date().toISOString(),
      workingOn: workingOn || "",
      openDocs: [],
      status: "active",
    };

    await s3.putObject(
      config,
      `_presence/${config.userName}.json`,
      JSON.stringify(entry, null, 2),
      {},
      "application/json"
    );
  } catch {
    // Silently fail — presence is nice-to-have, not critical
  }
}
