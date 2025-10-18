# WAHA MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with WhatsApp through the WAHA (WhatsApp HTTP API) platform.

## Features

- **Chat Management**: Get overview of recent WhatsApp chats
- **Message Operations**: Retrieve, send, and mark messages as read
- **MCP Integration**: Full compatibility with MCP clients like Claude Desktop

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your WAHA API connection:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your WAHA instance details.

## Configuration

Required environment variables in `.env`:

- `WAHA_BASE_URL`: Your WAHA server URL (e.g., `http://localhost:3000`)
- `WAHA_API_KEY`: Your WAHA API key for authentication
- `WAHA_SESSION`: WhatsApp session name (default: `default`)

## Development

### Build the project
```bash
npm run build
```

### Run in development mode with auto-reload
```bash
npm run dev
```

### Test with MCP Inspector
The MCP Inspector is a web-based tool to test your MCP server interactively:

```bash
npm run inspector
```

This will:
1. Start the WAHA MCP server
2. Launch the MCP Inspector web UI
3. Open your browser automatically

Use the inspector to:
- Test all 4 tools interactively
- View tool schemas
- See request/response data
- Debug tool calls

### Run in production
```bash
npm start
```

## Usage with Claude Desktop

Add this to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "waha": {
      "command": "node",
      "args": ["/absolute/path/to/waha-mcp-server/dist/index.js"],
      "env": {
        "WAHA_BASE_URL": "http://localhost:3000",
        "WAHA_API_KEY": "your-api-key-here",
        "WAHA_SESSION": "default"
      }
    }
  }
}
```

## Available Tools

### waha_get_chats
Get overview of recent WhatsApp chats. Returns chat ID, name, last message preview, and unread count.

**Parameters:**
- `limit` (optional): Number of chats to retrieve (default: 10, max: 100)
- `offset` (optional): Offset for pagination
- `chatIds` (optional): Array of specific chat IDs to filter (format: `number@c.us`)

**Example:**
```json
{
  "limit": 10
}
```

### waha_get_messages
Get messages from a specific WhatsApp chat. Returns message content, sender, timestamp, and status.

**Parameters:**
- `chatId` (required): Chat ID to get messages from (format: `number@c.us` for individual, `number@g.us` for group)
- `limit` (optional): Number of messages to retrieve (default: 10, max: 100)
- `offset` (optional): Offset for pagination
- `downloadMedia` (optional): Download media files (default: false)

**Example:**
```json
{
  "chatId": "1234567890@c.us",
  "limit": 10
}
```

### waha_send_message
Send a text message to a WhatsApp chat. Returns message ID and delivery timestamp.

**Parameters:**
- `chatId` (required): Chat ID to send message to (format: `number@c.us`)
- `text` (required): Message text to send
- `replyTo` (optional): Message ID to reply to
- `linkPreview` (optional): Enable link preview (default: true)

**Example:**
```json
{
  "chatId": "1234567890@c.us",
  "text": "Hello from MCP!"
}
```

### waha_mark_chat_read
Mark messages in a chat as read. Can specify number of recent messages or time range in days.

**Parameters:**
- `chatId` (required): Chat ID to mark as read (format: `number@c.us`)
- `messages` (optional): Number of recent messages to mark as read (default: 30)
- `days` (optional): Mark messages from last N days as read (default: 7)

**Example:**
```json
{
  "chatId": "1234567890@c.us",
  "messages": 30
}
```

## Project Structure

```
waha-mcp-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── config.ts             # Configuration management
│   ├── types/                # TypeScript type definitions
│   ├── tools/                # MCP tool implementations
│   └── client/               # WAHA API client
├── dist/                     # Built JavaScript output
├── .env                      # Your configuration (not in git)
├── .env.example              # Configuration template
├── package.json
├── tsconfig.json
└── PROJECT_SPEC.md          # Full project specification
```
## Chat ID Format

WhatsApp chat IDs have specific formats:
- **Individual chats**: `<phone_number>@c.us` (e.g., `1234567890@c.us`)
- **Group chats**: `<group_id>@g.us` (e.g., `123456789012345678@g.us`)

You can get chat IDs by using the `waha_get_chats` tool first.

## License

ISC
