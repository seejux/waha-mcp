import dotenv from "dotenv";

// Load environment variables from .env file (silent mode for Windows compatibility)
dotenv.config({ debug: false });

export interface WAHAConfig {
  wahaBaseUrl: string;
  wahaApiKey: string;
  wahaDefaultSession: string; // Default session to use when not specified
  webhook: {
    enabled: boolean;
    port: number;
    hmacKey?: string;
    ngrokAuthToken?: string;
    autoStart: boolean;
  };
}

/**
 * Validate and load configuration from environment variables
 */
function loadConfig(): WAHAConfig {
  const wahaBaseUrl = process.env.WAHA_BASE_URL;
  const wahaApiKey = process.env.WAHA_API_KEY;
  const wahaDefaultSession = process.env.WAHA_SESSION || "default";

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

  // Load webhook configuration
  const webhookEnabled = process.env.WEBHOOK_ENABLED === "true";
  const webhookPort = parseInt(process.env.WEBHOOK_PORT || "3001", 10);
  const webhookHmacKey = process.env.WEBHOOK_HMAC_KEY;
  const ngrokAuthToken = process.env.NGROK_AUTHTOKEN;
  const webhookAutoStart = process.env.WEBHOOK_AUTO_START !== "false"; // Default true

  return {
    wahaBaseUrl: normalizedBaseUrl,
    wahaApiKey,
    wahaDefaultSession,
    webhook: {
      enabled: webhookEnabled,
      port: webhookPort,
      hmacKey: webhookHmacKey,
      ngrokAuthToken,
      autoStart: webhookAutoStart,
    },
  };
}

// Export the configuration singleton
export const config = loadConfig();
