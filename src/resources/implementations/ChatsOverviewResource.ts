import { BaseResource } from "../base/BaseResource.js";
import type { ResourceContent, ResourceMetadata } from "../types.js";
import type { WAHAClient } from "../../client/index.js";
import { formatChatsOverview } from "../../tools/formatters.js";

/**
 * Resource: waha://chats/overview
 * Provides current chat list as a readable resource for context
 */
export class ChatsOverviewResource extends BaseResource {
  private wahaClient: WAHAClient;

  constructor(wahaClient: WAHAClient) {
    super();
    this.wahaClient = wahaClient;
  }

  getMetadata(): ResourceMetadata {
    return {
      uri: "waha://chats/overview",
      name: "WhatsApp Chats Overview",
      description:
        "Overview of recent WhatsApp chats with last message previews. " +
        "Supports parameters: limit (default: 10, max: 100), offset (for pagination), " +
        "ids (comma-separated chat IDs to filter)",
      mimeType: "text/plain",
    };
  }

  canHandle(uri: string): boolean {
    // Handle exact match or with query parameters
    return (
      uri === "waha://chats/overview" ||
      uri.startsWith("waha://chats/overview?")
    );
  }

  async read(uri: string): Promise<ResourceContent> {
    const params = this.parseUriParams(uri);

    // Parse parameters
    const limit = this.getNumberParam(params, "limit", 10, 100);
    const offset = this.getNumberParam(params, "offset", 0);

    // Parse chat IDs if provided (comma-separated)
    let chatIds: string[] | undefined;
    if (params.ids) {
      chatIds = params.ids.split(",").map(id => id.trim());
    }

    // Get session from query params or use default
    const session = params.session || (await import("../../config.js")).config.wahaDefaultSession;

    // Fetch chats from WAHA API
    const chats = await this.wahaClient.getChatsOverview(session, {
      limit,
      offset,
      ids: chatIds,
    });

    // Format for LLM consumption
    const formattedText = formatChatsOverview(chats);

    // Add metadata footer
    const footer = `\n\n--- Resource Info ---\nURI: ${uri}\nFetched: ${new Date().toISOString()}\nTotal Chats: ${chats.length}`;

    return {
      uri,
      mimeType: "text/plain",
      text: formattedText + footer,
    };
  }
}
