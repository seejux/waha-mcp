import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "./config.js";
import { WAHAClient, WAHAError } from "./client/index.js";
import {
  formatChatsOverview,
  formatMessages,
  formatSendMessageSuccess,
} from "./tools/formatters.js";
import { createResourceManager, ResourceManager } from "./resources/index.js";

// Webhook types (imported conditionally below)
type WebhookManager = any;

/**
 * WAHA MCP Server
 * Provides Model Context Protocol interface to WAHA WhatsApp HTTP API
 */
class WAHAMCPServer {
  private server: Server;
  private wahaClient: WAHAClient;
  private resourceManager: ResourceManager;
  private webhookManager?: WebhookManager;

  constructor() {
    // Initialize WAHA API client
    this.wahaClient = new WAHAClient(
      config.wahaBaseUrl,
      config.wahaApiKey,
      config.wahaSession
    );

    // Initialize resource manager with caching enabled (5 min TTL)
    this.resourceManager = createResourceManager(this.wahaClient, true, 300);

    this.server = new Server(
      {
        name: "waha-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "waha_get_chats",
            description: "Get overview of recent WhatsApp chats. Returns chat ID, name, last message preview, and unread count. Default limit is 10 chats.",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Number of chats to retrieve (default: 10, max: 100)",
                  default: 10,
                },
                offset: {
                  type: "number",
                  description: "Offset for pagination",
                },
                chatIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Optional filter for specific chat IDs (format: number@c.us)",
                },
              },
            },
          },
          {
            name: "waha_get_messages",
            description: "Get messages from a specific WhatsApp chat. Returns message content, sender, timestamp, and status. Default limit is 10 messages.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID to get messages from (format: number@c.us for individual, number@g.us for group)",
                },
                limit: {
                  type: "number",
                  description: "Number of messages to retrieve (default: 10, max: 100)",
                  default: 10,
                },
                offset: {
                  type: "number",
                  description: "Offset for pagination",
                },
                downloadMedia: {
                  type: "boolean",
                  description: "Download media files (default: false)",
                  default: false,
                },
              },
              required: ["chatId"],
            },
          },
          {
            name: "waha_send_message",
            description: "Send a text message to a WhatsApp chat. Returns message ID and delivery timestamp.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID to send message to (format: number@c.us)",
                },
                text: {
                  type: "string",
                  description: "Message text to send",
                },
                replyTo: {
                  type: "string",
                  description: "Optional: Message ID to reply to",
                },
                linkPreview: {
                  type: "boolean",
                  description: "Enable link preview (default: true)",
                  default: true,
                },
              },
              required: ["chatId", "text"],
            },
          },
          {
            name: "waha_mark_chat_read",
            description: "Mark messages in a chat as read. Can specify number of recent messages or time range in days.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID to mark as read (format: number@c.us)",
                },
                messages: {
                  type: "number",
                  description: "Number of recent messages to mark as read (default: 30)",
                  default: 30,
                },
                days: {
                  type: "number",
                  description: "Mark messages from last N days as read (default: 7)",
                  default: 7,
                },
              },
              required: ["chatId"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "waha_get_chats":
            return await this.handleGetChats(args);
          case "waha_get_messages":
            return await this.handleGetMessages(args);
          case "waha_send_message":
            return await this.handleSendMessage(args);
          case "waha_mark_chat_read":
            return await this.handleMarkChatRead(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isWAHAError = error instanceof WAHAError;

        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}${isWAHAError ? '\n\nThis is a WAHA API error. Please check your WAHA server connection and API credentials.' : ''}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = this.resourceManager.listResources();
      return {
        resources: resources.map(r => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        })),
      };
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        const content = await this.resourceManager.readResource(uri);
        return {
          contents: [
            {
              uri: content.uri,
              mimeType: content.mimeType,
              text: content.text,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read resource: ${errorMessage}`);
      }
    });
  }

  /**
   * Handle waha_get_chats tool
   */
  private async handleGetChats(args: any) {
    const limit = args.limit || 10;
    const offset = args.offset;
    const chatIds = args.chatIds;

    const chats = await this.wahaClient.getChatsOverview({
      limit,
      offset,
      ids: chatIds,
    });

    const formattedResponse = formatChatsOverview(chats);

    return {
      content: [
        {
          type: "text",
          text: formattedResponse,
        },
      ],
    };
  }

  /**
   * Handle waha_get_messages tool
   */
  private async handleGetMessages(args: any) {
    const chatId = args.chatId;
    const limit = args.limit || 10;
    const offset = args.offset;
    const downloadMedia = args.downloadMedia || false;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    const messages = await this.wahaClient.getChatMessages({
      chatId,
      limit,
      offset,
      downloadMedia,
    });

    const formattedResponse = formatMessages(messages);

    return {
      content: [
        {
          type: "text",
          text: formattedResponse,
        },
      ],
    };
  }

  /**
   * Handle waha_send_message tool
   */
  private async handleSendMessage(args: any) {
    const chatId = args.chatId;
    const text = args.text;
    const replyTo = args.replyTo;
    const linkPreview = args.linkPreview !== false; // Default true

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!text) {
      throw new Error("text is required");
    }

    const response = await this.wahaClient.sendTextMessage({
      chatId,
      text,
      reply_to: replyTo,
      linkPreview,
    });

    const formattedResponse = formatSendMessageSuccess(
      chatId,
      response.id,
      response.timestamp
    );

    return {
      content: [
        {
          type: "text",
          text: formattedResponse,
        },
      ],
    };
  }

  /**
   * Handle waha_mark_chat_read tool
   */
  private async handleMarkChatRead(args: any) {
    const chatId = args.chatId;
    const messages = args.messages || 30;
    const days = args.days || 7;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    await this.wahaClient.markChatAsRead({
      chatId,
      messages,
      days,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully marked messages as read in chat ${chatId}.\nMessages: ${messages}\nDays: ${days}`,
        },
      ],
    };
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private async cleanup(): Promise<void> {
    console.error("[WAHAMCPServer] Shutting down...");

    // Stop webhook system if running
    if (this.webhookManager) {
      await this.webhookManager.stop();
    }

    // Close MCP server
    await this.server.close();

    console.error("[WAHAMCPServer] Shutdown complete");
  }

  async run(): Promise<void> {
    // Start webhook system if configured (dynamic import to avoid loading ngrok when disabled)
    if (config.webhook.enabled && config.webhook.autoStart) {
      try {
        const { createWebhookManager } = await import("./webhooks/index.js");
        this.webhookManager = createWebhookManager(this.server, this.wahaClient, config.webhook);
        await this.webhookManager.start();
      } catch (error) {
        console.error("[WAHAMCPServer] Failed to start webhook system:", error);
        console.error("[WAHAMCPServer] Continuing without webhooks...");
      }
    }

    // Connect MCP server to stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("WAHA MCP Server running on stdio");
  }
}

// Start the server
const server = new WAHAMCPServer();
server.run().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
