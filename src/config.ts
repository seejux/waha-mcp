import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export interface WAHAConfig {
  wahaBaseUrl: string;
  wahaApiKey: string;
  wahaSession: string;
}

/**
 * Validate and load configuration from environment variables
 */
function loadConfig(): WAHAConfig {
  const wahaBaseUrl = process.env.WAHA_BASE_URL;
  const wahaApiKey = process.env.WAHA_API_KEY;
  const wahaSession = process.env.WAHA_SESSION || "default";

  // Validate required configuration
  if (!wahaBaseUrl) {
    throw new Error(
      "WAHA_BASE_URL environment variable is required. Please set it in .env file or environment."
    );
  }

  if (!wahaApiKey) {
    throw new Error(
      "WAHA_API_KEY environment variable is required. Please set it in .env file or environment."
    );
  }

  // Ensure base URL doesn't end with a slash
  const normalizedBaseUrl = wahaBaseUrl.endsWith("/")
    ? wahaBaseUrl.slice(0, -1)
    : wahaBaseUrl;

  return {
    wahaBaseUrl: normalizedBaseUrl,
    wahaApiKey,
    wahaSession,
  };
}

// Export the configuration singleton
export const config = loadConfig();
