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

  console.log('[Tool] waha_get_chats called:', { limit, offset, chatIds });
  const chats = await client.getChatsOverview({
    limit,
    offset,
    ids: chatIds,
  });
  console.log(`[Tool] waha_get_chats returned ${chats.length} chats`);

  return {
    content: [{ type: "text", text: formatChatsOverview(chats) }],
  };
}

async function handleGetMessages(client: WAHAClient, args: any) {
  if (!args.chatId) {
    throw new Error("chatId is required");
  }

  console.log('[Tool] waha_get_messages called:', {
    chatId: args.chatId,
    limit: args.limit || 10,
    offset: args.offset,
    downloadMedia: args.downloadMedia || false
  });

  const messages = await client.getChatMessages({
    chatId: args.chatId,
    limit: args.limit || 10,
    offset: args.offset,
    downloadMedia: args.downloadMedia || false,
  });

  console.log(`[Tool] waha_get_messages returned ${messages.length} messages`);

  return {
    content: [{ type: "text", text: formatMessages(messages) }],
  };
}

async function handleSendMessage(client: WAHAClient, args: any) {
  if (!args.chatId) throw new Error("chatId is required");
  if (!args.text) throw new Error("text is required");

  console.log('[Tool] waha_send_message called:', {
    chatId: args.chatId,
    textLength: args.text?.length,
    replyTo: args.replyTo,
    linkPreview: args.linkPreview !== false
  });

  const response = await client.sendTextMessage({
    chatId: args.chatId,
    text: args.text,
    reply_to: args.replyTo,
    linkPreview: args.linkPreview !== false,
  });

  console.log('[Tool] waha_send_message succeeded:', { messageId: response.id });

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

  console.log('[Tool] waha_mark_chat_read called:', {
    chatId: args.chatId,
    messages: args.messages || 30,
    days: args.days || 7
  });

  await client.markChatAsRead({
    chatId: args.chatId,
    messages: args.messages || 30,
    days: args.days || 7,
  });

  console.log('[Tool] waha_mark_chat_read succeeded');

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

// IMPORTANT: Add JSON body parser BEFORE MCP routes
app.use(express.json());

// Global request logger - logs ALL incoming requests
app.use((req, _res, next) => {
  console.log('\n' + '─'.repeat(60));
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`  Remote: ${req.ip || req.socket.remoteAddress}`);
  console.log(`  Headers:`, {
    'content-type': req.headers['content-type'],
    'accept': req.headers['accept'],
    'mcp-session-id': req.headers['mcp-session-id'],
    'user-agent': req.headers['user-agent']
  });
  console.log(`  req.body type: ${typeof req.body}, is object: ${typeof req.body === 'object'}, keys: ${req.body ? Object.keys(req.body).length : 'N/A'}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`  Body:`, JSON.stringify(req.body).substring(0, 200));
  }
  console.log('─'.repeat(60));
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'waha-mcp-server' });
});

// Handle POST requests (client-to-server messages)
app.post('/mcp', async (req: Request, res: Response) => {
  console.log('[MCP POST] Incoming request');
  console.log(`  Body type: ${typeof req.body}`);
  console.log(`  Body value: ${JSON.stringify(req.body)?.substring(0, 100)}`);
  console.log(`  Method: ${req.body?.method || 'unknown'}`);
  console.log(`  Request ID: ${req.body?.id || 'unknown'}`);

  try {
    // STATELESS MODE: Create a new transport for each request to prevent
    // request ID collisions. Different clients may use the same JSON-RPC request IDs,
    // which would cause responses to be routed to the wrong HTTP connections if
    // the transport state is shared.
    console.log('[MCP POST] Creating new stateless transport');

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,  // Stateless mode
      enableJsonResponse: true         // Use JSON responses instead of SSE
    });

    res.on('close', () => {
      transport.close();
    });

    const server = createServer();
    await server.connect(transport);
    console.log('[MCP POST] Server connected to transport');

    // Pass the pre-parsed body from express.json() middleware
    console.log(`[MCP POST] Passing parsedBody to handleRequest: ${req.body !== undefined}`);
    await transport.handleRequest(req, res, req.body);
    console.log(`[MCP POST] Request handled successfully`);
  } catch (error) {
    console.error('[MCP POST] Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

// Note: GET and DELETE endpoints are not needed in stateless mode with enableJsonResponse: true
// All communication happens via POST requests with JSON responses

// Start server
app.listen(MCP_PORT, () => {
  console.log('='.repeat(60));
  console.log('WAHA MCP Server (HTTP) - STARTED');
  console.log('='.repeat(60));
  console.log(`Server URL:    http://localhost:${MCP_PORT}`);
  console.log(`MCP endpoint:  http://localhost:${MCP_PORT}/mcp`);
  console.log(`Health check:  http://localhost:${MCP_PORT}/health`);
  console.log(`Active sessions: 0`);
  console.log('='.repeat(60));
  console.log('Waiting for connections...\n');
});

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  process.exit(0);
});
