/**
 * Centralized Tool Definitions
 * Import and export all tool definitions for easy management
 */

import { sessionTools } from "./session-tools.js";
import { pollTools } from "./poll-tools.js";
import { statusTools } from "./status-tools.js";
import { labelTools } from "./label-tools.js";
import { profileTools } from "./profile-tools.js";

/**
 * All available WAHA MCP tools combined
 */
export const allNewTools = [
  ...sessionTools,
  ...pollTools,
  ...statusTools,
  ...labelTools,
  ...profileTools,
];

// Export individual tool sets for selective imports
export { sessionTools, pollTools, statusTools, labelTools, profileTools };
