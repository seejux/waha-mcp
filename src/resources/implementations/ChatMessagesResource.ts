import { BaseResource } from "../base/BaseResource.js";
import type { ResourceContent, ResourceMetadata } from "../types.js";
import type { WAHAClient } from "../../client/index.js";
import { formatMessages } from "../../tools/formatters.js";

/**
 * Resource: waha://chat/{chatId}/messages
 * Provides chat message history as a readable resource for context
 */
export class ChatMessagesResource extends BaseResource {
  private wahaClient: WAHAClient;
  private static readonly URI_PATTERN = /^waha:\/\/chat\/([^/?]+)\/messages/;

  constructor(wahaClient: WAHAClient) {
    super();
    this.wahaClient = wahaClient;
  }

  getMetadata(): ResourceMetadata {
    return {
      uri: "waha://chat/{chatId}/messages",
      name: "WhatsApp Chat Messages",
      description:
        "Messages from a specific WhatsApp chat. " +
        "URI format: waha://chat/{chatId}/messages?limit=10&offset=0 " +
        "Supports parameters: limit (default: 10, max: 100), offset (for pagination), " +
        "downloadMedia (true/false), timestampGte, timestampLte, fromMe (true/false)",
      mimeType: "text/plain",
    };
  }

  canHandle(uri: string): boolean {
    return ChatMessagesResource.URI_PATTERN.test(uri);
  }

  async read(uri: string): Promise<ResourceContent> {
    // Extract chatId from URI path
    const match = uri.match(ChatMessagesResource.URI_PATTERN);
    if (!match) {
      throw new Error(`Invalid URI format. Expected: waha://chat/{chatId}/messages`);
    }

    const chatId = decodeURIComponent(match[1]);

    // Validate chat ID format
    if (!this.isValidChatId(chatId)) {
      throw new Error(
        `Invalid chat ID format: ${chatId}. ` +
        `Expected format: number@c.us (individual) or number@g.us (group)`
      );
    }

    // Parse query parameters
    const params = this.parseUriParams(uri);

    const limit = this.getNumberParam(params, "limit", 10, 100);
    const offset = this.getNumberParam(params, "offset", 0);
    const downloadMedia = this.getBooleanParam(params, "downloadMedia", false);

    // Build filters if provided
    const filters: any = {};
    if (params.timestampGte) {
      filters.timestampGte = parseInt(params.timestampGte, 10);
    }
    if (params.timestampLte) {
      filters.timestampLte = parseInt(params.timestampLte, 10);
    }
    if (params.fromMe !== undefined) {
      filters.fromMe = this.getBooleanParam(params, "fromMe", false);
    }

    // Get session from query params or use default
    const session = params.session || (await import("../../config.js")).config.wahaDefaultSession;

    // Fetch messages from WAHA API
    const messages = await this.wahaClient.getChatMessages(session, {
      chatId,
      limit,
      offset,
      downloadMedia,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });

    // Format for LLM consumption
    const formattedText = formatMessages(messages);

    // Add metadata footer
    const footer = [
      `\n\n--- Resource Info ---`,
      `URI: ${uri}`,
      `Chat ID: ${chatId}`,
      `Fetched: ${new Date().toISOString()}`,
      `Total Messages: ${messages.length}`,
      `Filters Applied: ${Object.keys(filters).length > 0 ? JSON.stringify(filters) : 'None'}`,
    ].join('\n');

    return {
      uri,
      mimeType: "text/plain",
      text: formattedText + footer,
    };
  }

  /**
   * Validate WhatsApp chat ID format
   */
  private isValidChatId(chatId: string): boolean {
    // Chat ID should be: number@c.us (individual) or number@g.us (group)
    return /^\d+@(c|g)\.us$/.test(chatId);
  }
}
