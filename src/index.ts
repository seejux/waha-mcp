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
import { allNewTools } from "./tools/all-tools.js";
import * as newHandlers from "./tools/new-handlers.js";

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
    // Initialize WAHA API client (without session - will be passed per-call)
    this.wahaClient = new WAHAClient(
      config.wahaBaseUrl,
      config.wahaApiKey
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
          {
            name: "waha_delete_message",
            description: "Delete a specific message from a chat. This is a destructive operation and cannot be undone.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                messageId: {
                  type: "string",
                  description: "Message ID to delete (format: {fromMe}_{chat}_{message_id}[_{participant}])",
                },
              },
              required: ["chatId", "messageId"],
            },
          },
          {
            name: "waha_edit_message",
            description: "Edit a sent message in a chat. Only works for messages sent by the bot.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                messageId: {
                  type: "string",
                  description: "Message ID to edit",
                },
                text: {
                  type: "string",
                  description: "New message text",
                },
                linkPreview: {
                  type: "boolean",
                  description: "Enable link preview (default: true)",
                  default: true,
                },
                linkPreviewHighQuality: {
                  type: "boolean",
                  description: "Enable high quality link preview (default: false)",
                  default: false,
                },
              },
              required: ["chatId", "messageId", "text"],
            },
          },
          {
            name: "waha_pin_message",
            description: "Pin a message in a chat. Pinned messages appear at the top of the chat.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                messageId: {
                  type: "string",
                  description: "Message ID to pin",
                },
                duration: {
                  type: "number",
                  description: "Pin duration in seconds (default: 86400 = 24 hours)",
                  default: 86400,
                },
              },
              required: ["chatId", "messageId"],
            },
          },
          {
            name: "waha_unpin_message",
            description: "Unpin a message in a chat.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                messageId: {
                  type: "string",
                  description: "Message ID to unpin",
                },
              },
              required: ["chatId", "messageId"],
            },
          },
          {
            name: "waha_clear_chat_messages",
            description: "Clear all messages from a chat. WARNING: This is a destructive operation that cannot be undone.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
              },
              required: ["chatId"],
            },
          },
          {
            name: "waha_delete_chat",
            description: "Delete a chat completely. WARNING: This is a destructive operation that cannot be undone.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
              },
              required: ["chatId"],
            },
          },
          {
            name: "waha_archive_chat",
            description: "Archive a chat. Archived chats are hidden from the main chat list.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
              },
              required: ["chatId"],
            },
          },
          {
            name: "waha_unarchive_chat",
            description: "Unarchive a chat. Moves the chat back to the main chat list.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
              },
              required: ["chatId"],
            },
          },
          {
            name: "waha_mark_chat_unread",
            description: "Mark a chat as unread. This adds an unread indicator to the chat.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
              },
              required: ["chatId"],
            },
          },
          {
            name: "waha_get_chat_picture",
            description: "Get the profile picture URL for a chat. Uses 24-hour cache by default.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                refresh: {
                  type: "boolean",
                  description: "Refresh from server instead of using cache (default: false)",
                  default: false,
                },
              },
              required: ["chatId"],
            },
          },
          {
            name: "waha_send_media",
            description: "Send media files (images, videos, or documents) to a WhatsApp chat. Supports URL or base64 data.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                mediaType: {
                  type: "string",
                  enum: ["image", "video", "document"],
                  description: "Type of media to send",
                },
                fileUrl: {
                  type: "string",
                  description: "URL of the file to send (use either fileUrl or fileData, not both)",
                },
                fileData: {
                  type: "string",
                  description: "Base64 encoded file data (use either fileUrl or fileData, not both)",
                },
                mimetype: {
                  type: "string",
                  description: "MIME type of the file (e.g., 'image/jpeg', 'video/mp4', 'application/pdf')",
                },
                filename: {
                  type: "string",
                  description: "Optional filename for the media",
                },
                caption: {
                  type: "string",
                  description: "Optional caption for the media",
                },
                replyTo: {
                  type: "string",
                  description: "Optional message ID to reply to",
                },
              },
              required: ["chatId", "mediaType", "mimetype"],
            },
          },
          {
            name: "waha_send_audio",
            description: "Send audio/voice messages to a WhatsApp chat. Supports URL or base64 data.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                fileUrl: {
                  type: "string",
                  description: "URL of the audio file to send (use either fileUrl or fileData, not both)",
                },
                fileData: {
                  type: "string",
                  description: "Base64 encoded audio data (use either fileUrl or fileData, not both)",
                },
                mimetype: {
                  type: "string",
                  description: "MIME type of the audio file (e.g., 'audio/ogg', 'audio/mpeg')",
                },
                filename: {
                  type: "string",
                  description: "Optional filename for the audio",
                },
                replyTo: {
                  type: "string",
                  description: "Optional message ID to reply to",
                },
              },
              required: ["chatId", "mimetype"],
            },
          },
          {
            name: "waha_send_location",
            description: "Send location coordinates to a WhatsApp chat.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                latitude: {
                  type: "number",
                  description: "Latitude coordinate",
                },
                longitude: {
                  type: "number",
                  description: "Longitude coordinate",
                },
                title: {
                  type: "string",
                  description: "Optional title/name for the location",
                },
                replyTo: {
                  type: "string",
                  description: "Optional message ID to reply to",
                },
              },
              required: ["chatId", "latitude", "longitude"],
            },
          },
          {
            name: "waha_send_contact",
            description: "Send contact card(s) to a WhatsApp chat using vCard format.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                vcard: {
                  type: "string",
                  description: "vCard formatted contact data (e.g., 'BEGIN:VCARD\\nVERSION:3.0\\nFN:Jane Doe\\nTEL:+1234567890\\nEND:VCARD')",
                },
                replyTo: {
                  type: "string",
                  description: "Optional message ID to reply to",
                },
              },
              required: ["chatId", "vcard"],
            },
          },
          {
            name: "waha_react_to_message",
            description: "Add an emoji reaction to a message. To remove a reaction, send an empty string.",
            inputSchema: {
              type: "object",
              properties: {
                messageId: {
                  type: "string",
                  description: "Message ID to react to",
                },
                reaction: {
                  type: "string",
                  description: "Emoji to react with (e.g., '👍', '❤️', '😂'). Use empty string to remove reaction.",
                },
              },
              required: ["messageId", "reaction"],
            },
          },
          {
            name: "waha_star_message",
            description: "Star or unstar a message.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                messageId: {
                  type: "string",
                  description: "Message ID to star/unstar",
                },
                star: {
                  type: "boolean",
                  description: "True to star the message, false to unstar",
                },
              },
              required: ["chatId", "messageId", "star"],
            },
          },
          {
            name: "waha_get_groups",
            description: "List all groups with filtering and pagination options.",
            inputSchema: {
              type: "object",
              properties: {
                sortBy: {
                  type: "string",
                  enum: ["id", "name"],
                  description: "Sort field (default: id)",
                },
                sortOrder: {
                  type: "string",
                  enum: ["asc", "desc"],
                  description: "Sort order (default: asc)",
                },
                limit: {
                  type: "number",
                  description: "Limit results (default: 100, max: 100)",
                },
                offset: {
                  type: "number",
                  description: "Offset for pagination",
                },
                exclude: {
                  type: "array",
                  items: { type: "string" },
                  description: "Exclude fields like 'participants'",
                },
              },
            },
          },
          {
            name: "waha_get_group_info",
            description: "Get detailed information about a specific group.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
              },
              required: ["groupId"],
            },
          },
          {
            name: "waha_get_group_picture",
            description: "Get group profile picture URL.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
                refresh: {
                  type: "boolean",
                  description: "Refresh from server (default: false)",
                  default: false,
                },
              },
              required: ["groupId"],
            },
          },
          {
            name: "waha_set_group_picture",
            description: "Set or update group profile picture.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
                fileUrl: {
                  type: "string",
                  description: "URL of the image (use either fileUrl or fileData)",
                },
                fileData: {
                  type: "string",
                  description: "Base64 encoded image data (use either fileUrl or fileData)",
                },
              },
              required: ["groupId"],
            },
          },
          {
            name: "waha_delete_group_picture",
            description: "Remove group profile picture.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
              },
              required: ["groupId"],
            },
          },
          {
            name: "waha_create_group",
            description: "Create a new WhatsApp group.",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Group name",
                },
                participants: {
                  type: "string",
                  description: "JSON array of participants (format: [{'id': 'number@c.us'}, ...])",
                },
              },
              required: ["name", "participants"],
            },
          },
          {
            name: "waha_update_group_subject",
            description: "Change group name/subject.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
                subject: {
                  type: "string",
                  description: "New group name",
                },
              },
              required: ["groupId", "subject"],
            },
          },
          {
            name: "waha_update_group_description",
            description: "Update group description.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
                description: {
                  type: "string",
                  description: "New group description",
                },
              },
              required: ["groupId", "description"],
            },
          },
          {
            name: "waha_leave_group",
            description: "Leave a group.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID to leave (format: number@g.us)",
                },
              },
              required: ["groupId"],
            },
          },
          {
            name: "waha_get_group_participants",
            description: "List all members in a group.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
              },
              required: ["groupId"],
            },
          },
          {
            name: "waha_add_group_participants",
            description: "Add member(s) to a group. Requires admin privileges.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
                participants: {
                  type: "string",
                  description: "JSON array of participants to add (format: [{'id': 'number@c.us'}, ...])",
                },
              },
              required: ["groupId", "participants"],
            },
          },
          {
            name: "waha_remove_group_participants",
            description: "Remove member(s) from a group. Requires admin privileges.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
                participants: {
                  type: "string",
                  description: "JSON array of participants to remove (format: [{'id': 'number@c.us'}, ...])",
                },
              },
              required: ["groupId", "participants"],
            },
          },
          {
            name: "waha_promote_group_admin",
            description: "Promote participant(s) to group admin. Requires admin privileges.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
                participants: {
                  type: "string",
                  description: "JSON array of participants to promote (format: [{'id': 'number@c.us'}, ...])",
                },
              },
              required: ["groupId", "participants"],
            },
          },
          {
            name: "waha_demote_group_admin",
            description: "Remove admin privileges from participant(s). Requires admin privileges.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
                participants: {
                  type: "string",
                  description: "JSON array of participants to demote (format: [{'id': 'number@c.us'}, ...])",
                },
              },
              required: ["groupId", "participants"],
            },
          },
          {
            name: "waha_get_group_invite_code",
            description: "Get group invite link.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
              },
              required: ["groupId"],
            },
          },
          {
            name: "waha_revoke_group_invite_code",
            description: "Revoke current invite link and generate a new one. Requires admin privileges.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
              },
              required: ["groupId"],
            },
          },
          {
            name: "waha_join_group",
            description: "Join a group using invite code/link.",
            inputSchema: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  description: "Invite code or full URL (e.g., 'https://chat.whatsapp.com/...')",
                },
              },
              required: ["code"],
            },
          },
          {
            name: "waha_get_group_join_info",
            description: "Get group information from invite link without joining.",
            inputSchema: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  description: "Invite code or full URL",
                },
              },
              required: ["code"],
            },
          },
          {
            name: "waha_set_group_messages_admin_only",
            description: "Toggle whether only admins can send messages. Requires admin privileges.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
                adminsOnly: {
                  type: "boolean",
                  description: "True = only admins can send, false = all members can send",
                },
              },
              required: ["groupId", "adminsOnly"],
            },
          },
          {
            name: "waha_set_group_info_admin_only",
            description: "Toggle whether only admins can edit group info. Requires admin privileges.",
            inputSchema: {
              type: "object",
              properties: {
                groupId: {
                  type: "string",
                  description: "Group ID (format: number@g.us)",
                },
                adminsOnly: {
                  type: "boolean",
                  description: "True = only admins can edit, false = all members can edit",
                },
              },
              required: ["groupId", "adminsOnly"],
            },
          },
          {
            name: "waha_get_groups_count",
            description: "Get total number of groups.",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "waha_get_contact",
            description: "Get contact information by ID.",
            inputSchema: {
              type: "object",
              properties: {
                contactId: {
                  type: "string",
                  description: "Contact ID (format: number@c.us)",
                },
              },
              required: ["contactId"],
            },
          },
          {
            name: "waha_get_all_contacts",
            description: "List all contacts with pagination.",
            inputSchema: {
              type: "object",
              properties: {
                sortBy: {
                  type: "string",
                  enum: ["id", "name"],
                  description: "Sort field (default: id)",
                },
                sortOrder: {
                  type: "string",
                  enum: ["asc", "desc"],
                  description: "Sort order (default: asc)",
                },
                limit: {
                  type: "number",
                  description: "Limit results (default: 100, max: 100)",
                },
                offset: {
                  type: "number",
                  description: "Offset for pagination",
                },
              },
            },
          },
          {
            name: "waha_check_contact_exists",
            description: "Check if phone number is registered on WhatsApp.",
            inputSchema: {
              type: "object",
              properties: {
                phone: {
                  type: "string",
                  description: "Phone number to check (e.g., '1234567890')",
                },
              },
              required: ["phone"],
            },
          },
          {
            name: "waha_get_contact_about",
            description: "Get contact's about/status text.",
            inputSchema: {
              type: "object",
              properties: {
                contactId: {
                  type: "string",
                  description: "Contact ID (format: number@c.us)",
                },
              },
              required: ["contactId"],
            },
          },
          {
            name: "waha_get_contact_profile_picture",
            description: "Get contact's profile picture URL.",
            inputSchema: {
              type: "object",
              properties: {
                contactId: {
                  type: "string",
                  description: "Contact ID (format: number@c.us)",
                },
                refresh: {
                  type: "boolean",
                  description: "Refresh from server (default: false)",
                  default: false,
                },
              },
              required: ["contactId"],
            },
          },
          {
            name: "waha_block_contact",
            description: "Block a contact.",
            inputSchema: {
              type: "object",
              properties: {
                contactId: {
                  type: "string",
                  description: "Contact ID to block (format: number@c.us)",
                },
              },
              required: ["contactId"],
            },
          },
          {
            name: "waha_unblock_contact",
            description: "Unblock a contact.",
            inputSchema: {
              type: "object",
              properties: {
                contactId: {
                  type: "string",
                  description: "Contact ID to unblock (format: number@c.us)",
                },
              },
              required: ["contactId"],
            },
          },
          {
            name: "waha_get_presence",
            description: "Get online/offline/typing status for a chat. Auto-subscribes if not already subscribed.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
              },
              required: ["chatId"],
            },
          },
          {
            name: "waha_subscribe_presence",
            description: "Subscribe to presence updates for a chat.",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
              },
              required: ["chatId"],
            },
          },
          {
            name: "waha_set_presence",
            description: "Set your own presence status (online, offline, typing, recording, or paused).",
            inputSchema: {
              type: "object",
              properties: {
                chatId: {
                  type: "string",
                  description: "Chat ID (format: number@c.us)",
                },
                presence: {
                  type: "string",
                  enum: ["online", "offline", "typing", "recording", "paused"],
                  description: "Presence status to set",
                },
              },
              required: ["chatId", "presence"],
            },
          },
          {
            name: "waha_get_all_presence",
            description: "Get all subscribed presence information.",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          // === NEW TOOLS: Session Management, Polls, Status, Labels ===
          ...allNewTools,
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
          case "waha_delete_message":
            return await this.handleDeleteMessage(args);
          case "waha_edit_message":
            return await this.handleEditMessage(args);
          case "waha_pin_message":
            return await this.handlePinMessage(args);
          case "waha_unpin_message":
            return await this.handleUnpinMessage(args);
          case "waha_clear_chat_messages":
            return await this.handleClearChatMessages(args);
          case "waha_delete_chat":
            return await this.handleDeleteChat(args);
          case "waha_archive_chat":
            return await this.handleArchiveChat(args);
          case "waha_unarchive_chat":
            return await this.handleUnarchiveChat(args);
          case "waha_mark_chat_unread":
            return await this.handleMarkChatUnread(args);
          case "waha_get_chat_picture":
            return await this.handleGetChatPicture(args);
          case "waha_send_media":
            return await this.handleSendMedia(args);
          case "waha_send_audio":
            return await this.handleSendAudio(args);
          case "waha_send_location":
            return await this.handleSendLocation(args);
          case "waha_send_contact":
            return await this.handleSendContact(args);
          case "waha_react_to_message":
            return await this.handleReactToMessage(args);
          case "waha_star_message":
            return await this.handleStarMessage(args);
          case "waha_get_groups":
            return await this.handleGetGroups(args);
          case "waha_get_group_info":
            return await this.handleGetGroupInfo(args);
          case "waha_get_group_picture":
            return await this.handleGetGroupPicture(args);
          case "waha_set_group_picture":
            return await this.handleSetGroupPicture(args);
          case "waha_delete_group_picture":
            return await this.handleDeleteGroupPicture(args);
          case "waha_create_group":
            return await this.handleCreateGroup(args);
          case "waha_update_group_subject":
            return await this.handleUpdateGroupSubject(args);
          case "waha_update_group_description":
            return await this.handleUpdateGroupDescription(args);
          case "waha_leave_group":
            return await this.handleLeaveGroup(args);
          case "waha_get_group_participants":
            return await this.handleGetGroupParticipants(args);
          case "waha_add_group_participants":
            return await this.handleAddGroupParticipants(args);
          case "waha_remove_group_participants":
            return await this.handleRemoveGroupParticipants(args);
          case "waha_promote_group_admin":
            return await this.handlePromoteGroupAdmin(args);
          case "waha_demote_group_admin":
            return await this.handleDemoteGroupAdmin(args);
          case "waha_get_group_invite_code":
            return await this.handleGetGroupInviteCode(args);
          case "waha_revoke_group_invite_code":
            return await this.handleRevokeGroupInviteCode(args);
          case "waha_join_group":
            return await this.handleJoinGroup(args);
          case "waha_get_group_join_info":
            return await this.handleGetGroupJoinInfo(args);
          case "waha_set_group_messages_admin_only":
            return await this.handleSetGroupMessagesAdminOnly(args);
          case "waha_set_group_info_admin_only":
            return await this.handleSetGroupInfoAdminOnly(args);
          case "waha_get_groups_count":
            return await this.handleGetGroupsCount(args);
          case "waha_get_contact":
            return await this.handleGetContact(args);
          case "waha_get_all_contacts":
            return await this.handleGetAllContacts(args);
          case "waha_check_contact_exists":
            return await this.handleCheckContactExists(args);
          case "waha_get_contact_about":
            return await this.handleGetContactAbout(args);
          case "waha_get_contact_profile_picture":
            return await this.handleGetContactProfilePicture(args);
          case "waha_get_chat_picture":
            return await this.handleGetChatPicture(args);
          case "waha_block_contact":
            return await this.handleBlockContact(args);
          case "waha_unblock_contact":
            return await this.handleUnblockContact(args);
          case "waha_get_presence":
            return await this.handleGetPresence(args);
          case "waha_subscribe_presence":
            return await this.handleSubscribePresence(args);
          case "waha_set_presence":
            return await this.handleSetPresence(args);
          case "waha_get_all_presence":
            return await this.handleGetAllPresence(args);
          
          // === NEW HANDLERS: Session Management ===
          case "waha_list_sessions":
            return await newHandlers.handleListSessions(this.wahaClient, args);
          case "waha_get_session":
            return await newHandlers.handleGetSession(this.wahaClient, args);
          case "waha_create_session":
            return await newHandlers.handleCreateSession(this.wahaClient, args);
          case "waha_start_session":
            return await newHandlers.handleStartSession(this.wahaClient, args);
          case "waha_stop_session":
            return await newHandlers.handleStopSession(this.wahaClient, args);
          case "waha_restart_session":
            return await newHandlers.handleRestartSession(this.wahaClient, args);
          case "waha_logout_session":
            return await newHandlers.handleLogoutSession(this.wahaClient, args);
          case "waha_delete_session":
            return await newHandlers.handleDeleteSession(this.wahaClient, args);
          case "waha_get_session_me":
            return await newHandlers.handleGetSessionMe(this.wahaClient, args);
          case "waha_get_qr_code":
            return await newHandlers.handleGetQRCode(this.wahaClient, args);
          case "waha_request_pairing_code":
            return await newHandlers.handleRequestPairingCode(this.wahaClient, args);
          case "waha_get_screenshot":
            return await newHandlers.handleGetScreenshot(this.wahaClient, args);
          
          // === NEW HANDLERS: Polls ===
          case "waha_send_poll":
            return await newHandlers.handleSendPoll(this.wahaClient, args);
          case "waha_send_poll_vote":
            return await newHandlers.handleSendPollVote(this.wahaClient, args);
          
          // === NEW HANDLERS: Status/Stories ===
          case "waha_send_text_status":
            return await newHandlers.handleSendTextStatus(this.wahaClient, args);
          case "waha_send_media_status":
            return await newHandlers.handleSendMediaStatus(this.wahaClient, args);
          case "waha_get_statuses":
            return await newHandlers.handleGetStatuses(this.wahaClient, args);
          case "waha_delete_status":
            return await newHandlers.handleDeleteStatus(this.wahaClient, args);
          
          // === NEW HANDLERS: Labels ===
          case "waha_get_labels":
            return await newHandlers.handleGetLabels(this.wahaClient, args);
          case "waha_get_chat_labels":
            return await newHandlers.handleGetChatLabels(this.wahaClient, args);
          case "waha_put_chat_labels":
            return await newHandlers.handlePutChatLabels(this.wahaClient, args);
          case "waha_delete_chat_label":
            return await newHandlers.handleDeleteChatLabel(this.wahaClient, args);
          case "waha_get_message_labels":
            return await newHandlers.handleGetMessageLabels(this.wahaClient, args);
          case "waha_put_message_labels":
            return await newHandlers.handlePutMessageLabels(this.wahaClient, args);
          case "waha_delete_message_label":
            return await newHandlers.handleDeleteMessageLabel(this.wahaClient, args);
          
          // === NEW HANDLERS: Profile Management ===
          case "waha_set_my_profile_name":
            return await newHandlers.handleSetMyProfileName(this.wahaClient, args);
          case "waha_set_my_profile_status":
            return await newHandlers.handleSetMyProfileStatus(this.wahaClient, args);
          case "waha_set_my_profile_picture":
            return await newHandlers.handleSetMyProfilePicture(this.wahaClient, args);
          case "waha_delete_my_profile_picture":
            return await newHandlers.handleDeleteMyProfilePicture(this.wahaClient, args);
          
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
    const session = (args as any).session || config.wahaDefaultSession;
    const limit = args.limit || 10;
    const offset = args.offset;
    const chatIds = args.chatIds;

    const chats = await this.wahaClient.getChatsOverview(session, {
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
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const limit = args.limit || 10;
    const offset = args.offset;
    const downloadMedia = args.downloadMedia || false;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    const messages = await this.wahaClient.getChatMessages(session, {
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
    const session = (args as any).session || config.wahaDefaultSession;
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

    const response = await this.wahaClient.sendTextMessage(session, {
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
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const messages = args.messages || 30;
    const days = args.days || 7;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    await this.wahaClient.markChatAsRead(session, {
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

  /**
   * Handle waha_delete_message tool
   */
  private async handleDeleteMessage(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const messageId = args.messageId;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!messageId) {
      throw new Error("messageId is required");
    }

    await this.wahaClient.deleteMessage(session, chatId, messageId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted message ${messageId} from chat ${chatId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_edit_message tool
   */
  private async handleEditMessage(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const messageId = args.messageId;
    const text = args.text;
    const linkPreview = args.linkPreview !== false;
    const linkPreviewHighQuality = args.linkPreviewHighQuality || false;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!messageId) {
      throw new Error("messageId is required");
    }

    if (!text) {
      throw new Error("text is required");
    }

    await this.wahaClient.editMessage(session, {
      chatId,
      messageId,
      text,
      linkPreview,
      linkPreviewHighQuality,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully edited message ${messageId} in chat ${chatId}.\nNew text: ${text}`,
        },
      ],
    };
  }

  /**
   * Handle waha_pin_message tool
   */
  private async handlePinMessage(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const messageId = args.messageId;
    const duration = args.duration || 86400; // Default 24 hours

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!messageId) {
      throw new Error("messageId is required");
    }

    await this.wahaClient.pinMessage(session, {
      chatId,
      messageId,
      duration,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully pinned message ${messageId} in chat ${chatId}.\nDuration: ${duration} seconds`,
        },
      ],
    };
  }

  /**
   * Handle waha_unpin_message tool
   */
  private async handleUnpinMessage(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const messageId = args.messageId;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!messageId) {
      throw new Error("messageId is required");
    }

    await this.wahaClient.unpinMessage(session, chatId, messageId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully unpinned message ${messageId} from chat ${chatId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_clear_chat_messages tool
   */
  private async handleClearChatMessages(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    await this.wahaClient.clearChatMessages(session, chatId);

    return {
      content: [
        {
          type: "text",
          text: `WARNING: All messages have been cleared from chat ${chatId}.\nThis operation cannot be undone.`,
        },
      ],
    };
  }

  /**
   * Handle waha_delete_chat tool
   */
  private async handleDeleteChat(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    await this.wahaClient.deleteChat(session, chatId);

    return {
      content: [
        {
          type: "text",
          text: `WARNING: Chat ${chatId} has been completely deleted.\nThis operation cannot be undone.`,
        },
      ],
    };
  }

  /**
   * Handle waha_archive_chat tool
   */
  private async handleArchiveChat(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    await this.wahaClient.archiveChat(session, chatId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully archived chat ${chatId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_unarchive_chat tool
   */
  private async handleUnarchiveChat(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    await this.wahaClient.unarchiveChat(session, chatId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully unarchived chat ${chatId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_mark_chat_unread tool
   */
  private async handleMarkChatUnread(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    await this.wahaClient.markChatUnread(session, chatId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully marked chat ${chatId} as unread.`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_chat_picture tool
   */
  private async handleGetChatPicture(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const refresh = args.refresh || false;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    const result = await this.wahaClient.getChatPicture(session, {
      chatId,
      refresh,
    });

    return {
      content: [
        {
          type: "text",
          text: `Chat picture URL for ${chatId}:\n${result.url}\n${refresh ? '(Refreshed from server)' : '(From 24h cache)'}`,
        },
      ],
    };
  }

  /**
   * Handle waha_send_media tool
   */
  private async handleSendMedia(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const mediaType = args.mediaType;
    const fileUrl = args.fileUrl;
    const fileData = args.fileData;
    const mimetype = args.mimetype;
    const filename = args.filename;
    const caption = args.caption;
    const replyTo = args.replyTo;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!mediaType) {
      throw new Error("mediaType is required");
    }

    if (!mimetype) {
      throw new Error("mimetype is required");
    }

    if (!fileUrl && !fileData) {
      throw new Error("Either fileUrl or fileData is required");
    }

    const file: any = {
      mimetype,
      filename,
    };

    if (fileUrl) {
      file.url = fileUrl;
    } else {
      file.data = fileData;
    }

    const response = await this.wahaClient.sendMedia(session, {
      chatId,
      file,
      mediaType,
      caption,
      reply_to: replyTo,
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
          text: `${formattedResponse}\nMedia type: ${mediaType}${caption ? `\nCaption: ${caption}` : ''}`,
        },
      ],
    };
  }

  /**
   * Handle waha_send_audio tool
   */
  private async handleSendAudio(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const fileUrl = args.fileUrl;
    const fileData = args.fileData;
    const mimetype = args.mimetype;
    const filename = args.filename;
    const replyTo = args.replyTo;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!mimetype) {
      throw new Error("mimetype is required");
    }

    if (!fileUrl && !fileData) {
      throw new Error("Either fileUrl or fileData is required");
    }

    const file: any = {
      mimetype,
      filename,
    };

    if (fileUrl) {
      file.url = fileUrl;
    } else {
      file.data = fileData;
    }

    const response = await this.wahaClient.sendAudio(session, {
      chatId,
      file,
      reply_to: replyTo,
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
          text: `${formattedResponse}\nMedia type: audio/voice`,
        },
      ],
    };
  }

  /**
   * Handle waha_send_location tool
   */
  private async handleSendLocation(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const latitude = args.latitude;
    const longitude = args.longitude;
    const title = args.title;
    const replyTo = args.replyTo;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (latitude === undefined || longitude === undefined) {
      throw new Error("latitude and longitude are required");
    }

    const response = await this.wahaClient.sendLocation(session, {
      chatId,
      latitude,
      longitude,
      title,
      reply_to: replyTo,
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
          text: `${formattedResponse}\nLocation: ${latitude}, ${longitude}${title ? `\nTitle: ${title}` : ''}`,
        },
      ],
    };
  }

  /**
   * Handle waha_send_contact tool
   */
  private async handleSendContact(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const vcard = args.vcard;
    const replyTo = args.replyTo;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!vcard) {
      throw new Error("vcard is required");
    }

    const response = await this.wahaClient.sendContact(session, {
      chatId,
      contacts: [{ vcard }],
      reply_to: replyTo,
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
          text: `${formattedResponse}\nContact card sent successfully.`,
        },
      ],
    };
  }

  /**
   * Handle waha_react_to_message tool
   */
  private async handleReactToMessage(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const messageId = args.messageId;
    const reaction = args.reaction;

    if (!messageId) {
      throw new Error("messageId is required");
    }

    if (reaction === undefined) {
      throw new Error("reaction is required");
    }

    await this.wahaClient.reactToMessage(session, {
      messageId,
      reaction,
    });

    return {
      content: [
        {
          type: "text",
          text: reaction === ""
            ? `Successfully removed reaction from message ${messageId}.`
            : `Successfully reacted to message ${messageId} with ${reaction}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_star_message tool
   */
  private async handleStarMessage(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const messageId = args.messageId;
    const star = args.star;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!messageId) {
      throw new Error("messageId is required");
    }

    if (star === undefined) {
      throw new Error("star is required");
    }

    await this.wahaClient.starMessage(session, {
      chatId,
      messageId,
      star,
    });

    return {
      content: [
        {
          type: "text",
          text: star
            ? `Successfully starred message ${messageId} in chat ${chatId}.`
            : `Successfully unstarred message ${messageId} in chat ${chatId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_groups tool
   */
  private async handleGetGroups(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groups = await this.wahaClient.getGroups(session, {
      sortBy: args.sortBy,
      sortOrder: args.sortOrder,
      limit: args.limit,
      offset: args.offset,
      exclude: args.exclude,
    });

    return {
      content: [
        {
          type: "text",
          text: `Found ${groups.length} group(s):\n${JSON.stringify(groups, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_group_info tool
   */
  private async handleGetGroupInfo(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    const groupInfo = await this.wahaClient.getGroupInfo(session, groupId);

    return {
      content: [
        {
          type: "text",
          text: `Group information for ${groupId}:\n${JSON.stringify(groupInfo, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_group_picture tool
   */
  private async handleGetGroupPicture(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;
    const refresh = args.refresh || false;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    const result = await this.wahaClient.getGroupPicture(session, {
      groupId,
      refresh,
    });

    return {
      content: [
        {
          type: "text",
          text: `Group picture URL for ${groupId}:\n${result.url}\n${refresh ? '(Refreshed from server)' : '(From cache)'}`,
        },
      ],
    };
  }

  /**
   * Handle waha_set_group_picture tool
   */
  private async handleSetGroupPicture(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;
    const fileUrl = args.fileUrl;
    const fileData = args.fileData;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    if (!fileUrl && !fileData) {
      throw new Error("Either fileUrl or fileData is required");
    }

    const file: any = {};
    if (fileUrl) file.url = fileUrl;
    if (fileData) file.data = fileData;

    await this.wahaClient.setGroupPicture(session, {
      groupId,
      file,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully set picture for group ${groupId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_delete_group_picture tool
   */
  private async handleDeleteGroupPicture(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    await this.wahaClient.deleteGroupPicture(session, groupId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted picture for group ${groupId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_create_group tool
   */
  private async handleCreateGroup(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const name = args.name;
    const participantsStr = args.participants;

    if (!name) {
      throw new Error("name is required");
    }

    if (!participantsStr) {
      throw new Error("participants is required");
    }

    const participants = JSON.parse(participantsStr);

    const result = await this.wahaClient.createGroup(session, {
      name,
      participants,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully created group "${name}".\nGroup details:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_update_group_subject tool
   */
  private async handleUpdateGroupSubject(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;
    const subject = args.subject;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    if (!subject) {
      throw new Error("subject is required");
    }

    await this.wahaClient.updateGroupSubject(session, {
      groupId,
      subject,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully updated group ${groupId} name to "${subject}".`,
        },
      ],
    };
  }

  /**
   * Handle waha_update_group_description tool
   */
  private async handleUpdateGroupDescription(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;
    const description = args.description;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    if (!description) {
      throw new Error("description is required");
    }

    await this.wahaClient.updateGroupDescription(session, {
      groupId,
      description,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully updated group ${groupId} description.`,
        },
      ],
    };
  }

  /**
   * Handle waha_leave_group tool
   */
  private async handleLeaveGroup(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    await this.wahaClient.leaveGroup(session, groupId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully left group ${groupId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_group_participants tool
   */
  private async handleGetGroupParticipants(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    const participants = await this.wahaClient.getGroupParticipants(session, groupId);

    return {
      content: [
        {
          type: "text",
          text: `Group ${groupId} participants (${participants.length}):\n${JSON.stringify(participants, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_add_group_participants tool
   */
  private async handleAddGroupParticipants(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;
    const participantsStr = args.participants;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    if (!participantsStr) {
      throw new Error("participants is required");
    }

    const participants = JSON.parse(participantsStr);

    const result = await this.wahaClient.addGroupParticipants(session, {
      groupId,
      participants,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully added ${participants.length} participant(s) to group ${groupId}.\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_remove_group_participants tool
   */
  private async handleRemoveGroupParticipants(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;
    const participantsStr = args.participants;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    if (!participantsStr) {
      throw new Error("participants is required");
    }

    const participants = JSON.parse(participantsStr);

    const result = await this.wahaClient.removeGroupParticipants(session, {
      groupId,
      participants,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully removed ${participants.length} participant(s) from group ${groupId}.\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_promote_group_admin tool
   */
  private async handlePromoteGroupAdmin(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;
    const participantsStr = args.participants;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    if (!participantsStr) {
      throw new Error("participants is required");
    }

    const participants = JSON.parse(participantsStr);

    const result = await this.wahaClient.promoteGroupAdmin(session, {
      groupId,
      participants,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully promoted ${participants.length} participant(s) to admin in group ${groupId}.\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_demote_group_admin tool
   */
  private async handleDemoteGroupAdmin(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;
    const participantsStr = args.participants;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    if (!participantsStr) {
      throw new Error("participants is required");
    }

    const participants = JSON.parse(participantsStr);

    const result = await this.wahaClient.demoteGroupAdmin(session, {
      groupId,
      participants,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully demoted ${participants.length} admin(s) in group ${groupId}.\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_group_invite_code tool
   */
  private async handleGetGroupInviteCode(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    const result = await this.wahaClient.getGroupInviteCode(session, groupId);

    return {
      content: [
        {
          type: "text",
          text: `Group ${groupId} invite link:\n${result.inviteCode}`,
        },
      ],
    };
  }

  /**
   * Handle waha_revoke_group_invite_code tool
   */
  private async handleRevokeGroupInviteCode(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    const result = await this.wahaClient.revokeGroupInviteCode(session, groupId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully revoked previous invite code for group ${groupId}.\nNew invite link:\n${result.inviteCode}`,
        },
      ],
    };
  }

  /**
   * Handle waha_join_group tool
   */
  private async handleJoinGroup(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const code = args.code;

    if (!code) {
      throw new Error("code is required");
    }

    const result = await this.wahaClient.joinGroup(session, code);

    return {
      content: [
        {
          type: "text",
          text: `Successfully joined group.\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_group_join_info tool
   */
  private async handleGetGroupJoinInfo(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const code = args.code;

    if (!code) {
      throw new Error("code is required");
    }

    const result = await this.wahaClient.getGroupJoinInfo(session, code);

    return {
      content: [
        {
          type: "text",
          text: `Group information:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_set_group_messages_admin_only tool
   */
  private async handleSetGroupMessagesAdminOnly(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;
    const adminsOnly = args.adminsOnly;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    if (adminsOnly === undefined) {
      throw new Error("adminsOnly is required");
    }

    await this.wahaClient.setGroupMessagesAdminOnly(session, {
      groupId,
      adminsOnly,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully set group ${groupId} messages to ${adminsOnly ? 'admins only' : 'all members'}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_set_group_info_admin_only tool
   */
  private async handleSetGroupInfoAdminOnly(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const groupId = args.groupId;
    const adminsOnly = args.adminsOnly;

    if (!groupId) {
      throw new Error("groupId is required");
    }

    if (adminsOnly === undefined) {
      throw new Error("adminsOnly is required");
    }

    await this.wahaClient.setGroupInfoAdminOnly(session, {
      groupId,
      adminsOnly,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully set group ${groupId} info editing to ${adminsOnly ? 'admins only' : 'all members'}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_groups_count tool
   */
  private async handleGetGroupsCount(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const result = await this.wahaClient.getGroupsCount(session, );

    return {
      content: [
        {
          type: "text",
          text: `Total number of groups: ${result.count}`,
        },
      ],
    };
  }

  // ==================== CONTACT MANAGEMENT HANDLERS ====================

  /**
   * Handle waha_get_contact tool
   */
  private async handleGetContact(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const contactId = args.contactId;

    if (!contactId) {
      throw new Error("contactId is required");
    }

    const contact = await this.wahaClient.getContact(session, contactId);

    return {
      content: [
        {
          type: "text",
          text: `Contact information for ${contactId}:\n${JSON.stringify(contact, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_all_contacts tool
   */
  private async handleGetAllContacts(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const contacts = await this.wahaClient.getAllContacts(session, {
      sortBy: args.sortBy,
      sortOrder: args.sortOrder,
      limit: args.limit,
      offset: args.offset,
    });

    return {
      content: [
        {
          type: "text",
          text: `Found ${contacts.length} contact(s):\n${JSON.stringify(contacts, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_check_contact_exists tool
   */
  private async handleCheckContactExists(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const phone = args.phone;

    if (!phone) {
      throw new Error("phone is required");
    }

    const result = await this.wahaClient.checkContactExists(session, phone);

    return {
      content: [
        {
          type: "text",
          text: `Contact existence check for ${phone}:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_contact_about tool
   */
  private async handleGetContactAbout(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const contactId = args.contactId;

    if (!contactId) {
      throw new Error("contactId is required");
    }

    const result = await this.wahaClient.getContactAbout(session, contactId);

    return {
      content: [
        {
          type: "text",
          text: `About/status for ${contactId}:\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_contact_profile_picture tool
   */
  private async handleGetContactProfilePicture(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const contactId = args.contactId;
    const refresh = args.refresh || false;

    if (!contactId) {
      throw new Error("contactId is required");
    }

    const result = await this.wahaClient.getContactProfilePicture(session, {
      contactId,
      refresh,
    });

    return {
      content: [
        {
          type: "text",
          text: `Profile picture URL for ${contactId}:\n${result.url}\n${refresh ? '(Refreshed from server)' : '(From cache)'}`,
        },
      ],
    };
  }

  /**
   * Handle waha_block_contact tool
   */
  private async handleBlockContact(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const contactId = args.contactId;

    if (!contactId) {
      throw new Error("contactId is required");
    }

    await this.wahaClient.blockContact(session, contactId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully blocked contact ${contactId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_unblock_contact tool
   */
  private async handleUnblockContact(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const contactId = args.contactId;

    if (!contactId) {
      throw new Error("contactId is required");
    }

    await this.wahaClient.unblockContact(session, contactId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully unblocked contact ${contactId}.`,
        },
      ],
    };
  }

  // ==================== PRESENCE/STATUS HANDLERS ====================

  /**
   * Handle waha_get_presence tool
   */
  private async handleGetPresence(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    const presence = await this.wahaClient.getPresence(session, chatId);

    return {
      content: [
        {
          type: "text",
          text: `Presence information for ${chatId}:\n${JSON.stringify(presence, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Handle waha_subscribe_presence tool
   */
  private async handleSubscribePresence(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    await this.wahaClient.subscribePresence(session, chatId);

    return {
      content: [
        {
          type: "text",
          text: `Successfully subscribed to presence updates for ${chatId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_set_presence tool
   */
  private async handleSetPresence(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const chatId = args.chatId;
    const presence = args.presence;

    if (!chatId) {
      throw new Error("chatId is required");
    }

    if (!presence) {
      throw new Error("presence is required");
    }

    await this.wahaClient.setPresence(session, {
      chatId,
      presence,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully set presence to "${presence}" for ${chatId}.`,
        },
      ],
    };
  }

  /**
   * Handle waha_get_all_presence tool
   */
  private async handleGetAllPresence(args: any) {
    const session = (args as any).session || config.wahaDefaultSession;
    const presences = await this.wahaClient.getAllPresence(session, );

    return {
      content: [
        {
          type: "text",
          text: `All subscribed presence information:\n${JSON.stringify(presences, null, 2)}`,
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
        this.webhookManager = createWebhookManager(this.server, this.wahaClient, config.webhook, config.wahaDefaultSession);
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
