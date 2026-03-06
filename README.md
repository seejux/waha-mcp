# WAHA MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with WhatsApp through the WAHA (WhatsApp HTTP API) platform.

<a href="https://glama.ai/mcp/servers/@seejux/waha-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@seejux/waha-mcp/badge" alt="WAHA Server MCP server" />
</a>

## Features

- **Chat Management**: Get overview of recent WhatsApp chats
- **Message Operations**: Retrieve, send, and mark messages as read
- **MCP Resources**: Access WhatsApp data as context-aware resources with caching
- **MCP Integration**: Full compatibility with MCP clients
- **Dual Mode**: Supports both local (stdio) and remote (HTTP) connections

## Quick Start

**New users?** [QUICK_START.md](QUICK_START.md)

**Remote HTTP setup?** [REMOTE_SETUP.md](REMOTE_SETUP.md)

**Detailed usage?** [USAGE_GUIDE.md](USAGE_GUIDE.md)

**MCP Resources?** [RESOURCES_GUIDE.md](RESOURCES_GUIDE.md)

**Project specification?** [PROJECT_SPEC.md](PROJECT_SPEC.md)

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
- Test all tools interactively
- View tool schemas
- See request/response data
- Debug tool calls

### Run in production

**Stdio mode** (for local MCP clients):
```bash
npm start
```

**HTTP mode** (for remote access):
```bash
npm run start:http
```

See [REMOTE_SETUP.md](REMOTE_SETUP.md) for HTTP mode documentation.

## Usage with Claude Desktop

**For detailed setup instructions, see [CLAUDE_DESKTOP_SETUP.md](CLAUDE_DESKTOP_SETUP.md)**

Add this to your Claude Desktop MCP configuration:

**Windows:**
```json
{
  "mcpServers": {
    "waha": {
      "command": "node",
      "args": ["C:\\Users\\YourUsername\\path\\to\\waha\\dist\\index.js"],
      "env": {
        "WAHA_BASE_URL": "http://localhost:3000",
        "WAHA_API_KEY": "your-api-key-here",
        "WAHA_SESSION": "default"
      }
    }
  }
}
```

**Mac/Linux:**
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

> **Note:** Windows users should use double backslashes (`\\`) in paths. See [CLAUDE_DESKTOP_SETUP.md](CLAUDE_DESKTOP_SETUP.md) for troubleshooting.

## Available Tools

### Chat Management
| Tool | Description |
|------|-------------|
| `waha_get_chats` | Get overview of recent WhatsApp chats |
| `waha_get_messages` | Get messages from a specific chat |
| `waha_mark_chat_read` | Mark messages in a chat as read |
| `waha_mark_chat_unread` | Mark a chat as unread |
| `waha_clear_chat_messages` | Clear all messages from a chat (destructive) |
| `waha_delete_chat` | Delete a chat completely (destructive) |
| `waha_archive_chat` | Archive a chat |
| `waha_unarchive_chat` | Unarchive a chat |
| `waha_get_chat_picture` | Get the profile picture URL for a chat |

### Messaging
| Tool | Description |
|------|-------------|
| `waha_send_message` | Send a text message to a chat |
| `waha_send_media` | Send images, videos, or documents |
| `waha_send_audio` | Send audio/voice messages |
| `waha_send_location` | Send location coordinates |
| `waha_send_contact` | Send contact card(s) using vCard format |
| `waha_edit_message` | Edit a sent message (own messages only) |
| `waha_delete_message` | Delete a specific message (destructive) |
| `waha_pin_message` | Pin a message in a chat |
| `waha_unpin_message` | Unpin a message in a chat |
| `waha_react_to_message` | Add or remove an emoji reaction |
| `waha_star_message` | Star or unstar a message |

### Groups
| Tool | Description |
|------|-------------|
| `waha_get_groups` | List all groups with filtering and pagination |
| `waha_get_groups_count` | Get total number of groups |
| `waha_get_group_info` | Get detailed info about a specific group |
| `waha_get_group_picture` | Get group profile picture URL |
| `waha_set_group_picture` | Set or update group profile picture |
| `waha_delete_group_picture` | Remove group profile picture |
| `waha_create_group` | Create a new WhatsApp group |
| `waha_update_group_subject` | Change group name/subject |
| `waha_update_group_description` | Update group description |
| `waha_leave_group` | Leave a group |
| `waha_get_group_participants` | List all members in a group |
| `waha_add_group_participants` | Add member(s) to a group (admin required) |
| `waha_remove_group_participants` | Remove member(s) from a group (admin required) |
| `waha_promote_group_admin` | Promote participant(s) to admin (admin required) |
| `waha_demote_group_admin` | Remove admin privileges (admin required) |
| `waha_get_group_invite_code` | Get group invite link |
| `waha_revoke_group_invite_code` | Revoke invite link and generate a new one (admin required) |
| `waha_join_group` | Join a group using an invite code/link |
| `waha_get_group_join_info` | Get group info from invite link without joining |
| `waha_set_group_messages_admin_only` | Toggle admin-only messaging (admin required) |
| `waha_set_group_info_admin_only` | Toggle admin-only group info editing (admin required) |

### Contacts
| Tool | Description |
|------|-------------|
| `waha_get_contact` | Get contact information by ID |
| `waha_get_all_contacts` | List all contacts with pagination |
| `waha_check_contact_exists` | Check if a phone number is registered on WhatsApp |
| `waha_get_contact_about` | Get contact's about/status text |
| `waha_get_contact_profile_picture` | Get contact's profile picture URL |
| `waha_block_contact` | Block a contact |
| `waha_unblock_contact` | Unblock a contact |

### Presence
| Tool | Description |
|------|-------------|
| `waha_get_presence` | Get online/offline/typing status for a chat |
| `waha_subscribe_presence` | Subscribe to presence updates for a chat |
| `waha_get_all_presence` | Get all subscribed presence information |
| `waha_set_presence` | Set your own presence status (online, offline, typing, etc.) |

## MCP Resources

In addition to tools, the server exposes **MCP Resources** for context-aware data access:

### Available Resources

- `waha://chats/overview` - Recent chats with last message previews
- `waha://chat/{chatId}/messages` - Message history from a specific chat

Resources support query parameters for filtering and pagination. Data is cached for 5 minutes for performance.

**See [RESOURCES_GUIDE.md](RESOURCES_GUIDE.md) for detailed documentation.**

## Project Structure

```
waha-mcp-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── config.ts             # Configuration management
│   ├── types/                # TypeScript type definitions
│   ├── tools/                # MCP tool implementations
│   ├── resources/            # MCP resource implementations
│   │   ├── base/             # Base resource class
│   │   ├── implementations/  # Concrete resources
│   │   ├── cache/            # LRU caching layer
│   │   └── manager/          # Resource registry
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