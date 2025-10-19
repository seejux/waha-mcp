import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { WAHAWebhookPayload, MCPNotificationData } from "../types.js";

/**
 * Abstract base class for webhook event handlers
 * Provides common functionality for processing WAHA events
 */
export abstract class BaseEventHandler {
  protected mcpServer: Server;

  constructor(mcpServer: Server) {
    this.mcpServer = mcpServer;
  }

  /**
   * Handle webhook event
   * @param payload WAHA webhook payload
   */
  abstract handle(payload: WAHAWebhookPayload): Promise<void>;

  /**
   * Check if this handler can process the given event type
   */
  abstract canHandle(eventType: string): boolean;

  /**
   * Emit MCP notification to connected clients
   */
  protected async emitNotification(data: MCPNotificationData): Promise<void> {
    try {
      await this.mcpServer.notification({
        method: "notifications/message",
        params: {
          ...data,
          _meta: {},
        } as any,
      });
      console.error(`[EventHandler] Emitted notification: ${data.type}`);
    } catch (error) {
      console.error("[EventHandler] Failed to emit notification:", error);
    }
  }

  /**
   * Format timestamp to readable string
   */
  protected formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }

  /**
   * Extract chat ID from message
   */
  protected extractChatId(from: string, to: string, fromMe: boolean): string {
    // If message is from me, the chat is with "to"
    // Otherwise, the chat is with "from"
    return fromMe ? to : from;
  }

  /**
   * Truncate text to max length
   */
  protected truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + "...";
  }
}
