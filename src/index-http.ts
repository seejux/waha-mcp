#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "./config.js";
import { WAHAClient, WAHAError } from "./client/index.js";
import {
  formatChatsOverview,
  formatMessages,
  formatSendMessageSuccess,
} from "./tools/formatters.js";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

// Store active transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};

// Get port from environment or use default
const MCP_PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT) : 3001;

/**
 * Create and configure an MCP server instance
 */
function createServer(): Server {
  const wahaClient = new WAHAClient(
    config.wahaBaseUrl,
    config.wahaApiKey,
    config.wahaSession
  );

  const server = new Server(
    {
      name: "waha-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "waha_get_chats",
          description:
            "Get overview of recent WhatsApp chats. Returns chat ID, name, last message preview, and unread count. Default limit is 10 chats.",
          inputSchema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description:
                  "Number of chats to retrieve (default: 10, max: 100)",
                default: 10,
              },
              offset: {
                type: "number",
                description: "Offset for pagination",
              },
              chatIds: {
                type: "array",
                items: { type: "string" },
                description:
                  "Optional filter for specific chat IDs (format: number@c.us)",
              },
            },
          },
        },
        {
          name: "waha_get_messages",
          description:
            "Get messages from a specific WhatsApp chat. Returns message content, sender, timestamp, and status. Default limit is 10 messages.",
          inputSchema: {
            type: "object",
            properties: {
              chatId: {
                type: "string",
                description:
                  "Chat ID to get messages from (format: number@c.us for individual, number@g.us for group)",
              },
              limit: {
                type: "number",
                description:
                  "Number of messages to retrieve (default: 10, max: 100)",
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
          description:
            "Send a text message to a WhatsApp chat. Returns message ID and delivery timestamp.",
          inputSchema: {
            type: "object",
            properties: {
              chatId: {
                type: "string",
                description:
                  "Chat ID to send message to (format: number@c.us)",
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
          description:
            "Mark messages in a chat as read. Can specify number of recent messages or time range in days.",
          inputSchema: {
            type: "object",
            properties: {
              chatId: {
                type: "string",
                description: "Chat ID to mark as read (format: number@c.us)",
              },
              messages: {
                type: "number",
                description:
                  "Number of recent messages to mark as read (default: 30)",
                default: 30,
              },
              days: {
                type: "number",
                description:
                  "Mark messages from last N days as read (default: 7)",
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
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "waha_get_chats":
          return await handleGetChats(wahaClient, args);
        case "waha_get_messages":
          return await handleGetMessages(wahaClient, args);
        case "waha_send_message":
          return await handleSendMessage(wahaClient, args);
        case "waha_mark_chat_read":
          return await handleMarkChatRead(wahaClient, args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isWAHAError = error instanceof WAHAError;

      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorMessage}${isWAHAError ? "\n\nThis is a WAHA API error. Please check your WAHA server connection and API credentials." : ""}`,
          },
        ],
        isError: true,
      };
    }
  });

  server.onerror = (error) => {
    console.error("[MCP Error]", error);
  };

  return server;
}

// Tool handlers
async function handleGetChats(client: WAHAClient, args: any) {
  const limit = args.limit || 10;
  const offset = args.offset;
  const chatIds = args.chatIds;

  const chats = await client.getChatsOverview({
    limit,
    offset,
    ids: chatIds,
  });

  return {
    content: [{ type: "text", text: formatChatsOverview(chats) }],
  };
}

async function handleGetMessages(client: WAHAClient, args: any) {
  if (!args.chatId) {
    throw new Error("chatId is required");
  }

  const messages = await client.getChatMessages({
    chatId: args.chatId,
    limit: args.limit || 10,
    offset: args.offset,
    downloadMedia: args.downloadMedia || false,
  });

  return {
    content: [{ type: "text", text: formatMessages(messages) }],
  };
}

async function handleSendMessage(client: WAHAClient, args: any) {
  if (!args.chatId) throw new Error("chatId is required");
  if (!args.text) throw new Error("text is required");

  const response = await client.sendTextMessage({
    chatId: args.chatId,
    text: args.text,
    reply_to: args.replyTo,
    linkPreview: args.linkPreview !== false,
  });

  return {
    content: [
      {
        type: "text",
        text: formatSendMessageSuccess(args.chatId, response.id, response.timestamp),
      },
    ],
  };
}

async function handleMarkChatRead(client: WAHAClient, args: any) {
  if (!args.chatId) throw new Error("chatId is required");

  await client.markChatAsRead({
    chatId: args.chatId,
    messages: args.messages || 30,
    days: args.days || 7,
  });

  return {
    content: [
      {
        type: "text",
        text: `Successfully marked messages as read in chat ${args.chatId}.\nMessages: ${args.messages || 30}\nDays: ${args.days || 7}`,
      },
    ],
  };
}

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'waha-mcp-server' });
});

// Handle POST requests (client-to-server messages)
app.post('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;

  // Get or create transport for this session
  let transport = sessionId ? transports[sessionId] : undefined;

  if (!transport) {
    // Create new transport for new session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        console.log(`Session initialized: ${newSessionId}`);
        transports[newSessionId] = transport!;
      },
    });

    // Setup close handler
    transport.onclose = () => {
      const sid = transport!.sessionId;
      if (sid && transports[sid]) {
        console.log(`Transport closed for session ${sid}`);
        delete transports[sid];
      }
    };

    // Connect to server
    const server = createServer();
    await server.connect(transport);
  }

  // Handle the request
  await transport.handleRequest(req, res);
});

// Handle GET requests (server-to-client event streams)
app.get('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  await transports[sessionId].handleRequest(req, res);
});

// Handle DELETE requests (session termination)
app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  console.log(`Session termination requested: ${sessionId}`);
  await transports[sessionId].handleRequest(req, res);
});

// Start server
app.listen(MCP_PORT, () => {
  console.log(`WAHA MCP Server (HTTP) running on http://localhost:${MCP_PORT}`);
  console.log(`MCP endpoint: http://localhost:${MCP_PORT}/mcp`);
  console.log(`Health check: http://localhost:${MCP_PORT}/health`);
});

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');

  for (const sessionId in transports) {
    try {
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }

  process.exit(0);
});
