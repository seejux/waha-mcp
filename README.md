# WAHA MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with WhatsApp through the WAHA (WhatsApp HTTP API) platform.

## Features

- **🔐 Session Management**: Complete control over WhatsApp sessions - create, start, stop, restart, authenticate
- **📝 Message Operations**: Send, receive, edit, delete, pin, react, and mark messages as read
- **📁 Chat Management**: Archive, delete, and organize chats with profile pictures
- **📊 Polls**: Create and vote on polls with single or multiple answer options
- **📸 Status/Stories**: Send and manage WhatsApp statuses (text, images, videos)
- **👥 Group Management**: Full group control - create, manage members, settings, and invite links
- **👤 Contact Management**: Check contacts, get info, profile pictures, block/unblock
- **🏷️ Labels**: WhatsApp Business labels for chats and messages
- **📨 Rich Media**: Send images, videos, audio, documents, locations, and contacts
- **👁️ Presence**: Monitor and set online/typing status
- **🔄 Real-time Events**: Webhook and WebSocket support for live updates
- **🎯 MCP Integration**: Full compatibility with MCP clients like Claude Desktop

**Total: 74+ comprehensive WAHA API tools** covering all major WhatsApp functionality!

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
- `WAHA_SESSION`: (Optional) Default WhatsApp session name to use when not specified in tool calls (default: `default`)

### Multi-Session Support

The WAHA MCP Server now supports managing multiple WhatsApp sessions! Each tool accepts an optional `session` parameter:

- **If provided**: The tool operates on the specified session
- **If not provided**: Uses the `WAHA_SESSION` environment variable as default

**Examples:**
```javascript
// Use default session from WAHA_SESSION env var
{
  "name": "waha_get_chats",
  "arguments": { "limit": 10 }
}

// Specify a different session
{
  "name": "waha_get_chats", 
  "arguments": { "session": "business", "limit": 10 }
}

// Work with multiple sessions at once
// List all sessions
{
  "name": "waha_list_sessions",
  "arguments": { "all": true }
}

// Update profile pictures for all sessions
// Get sessions, then for each session:
{
  "name": "waha_set_my_profile_picture",
  "arguments": {
    "session": "personal",
    "file": { "mimetype": "image/jpeg", "data": "base64..." }
  }
}
```

This enables powerful use cases like:
- Managing personal and business accounts separately
- Bulk operations across multiple accounts
- Different configurations per session

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

The WAHA MCP Server now provides **74+ comprehensive tools** covering all major WAHA API capabilities:

### 📝 Message Management (4 tools)
- **waha_get_chats**: Get overview of recent chats with unread counts
- **waha_get_messages**: Retrieve messages from a specific chat
- **waha_send_message**: Send text messages with link preview and reply support
- **waha_mark_chat_read**: Mark messages as read in a chat

### ✏️ Message Operations (7 tools)
- **waha_delete_message**: Delete a specific message
- **waha_edit_message**: Edit a sent message
- **waha_pin_message**: Pin a message in a chat
- **waha_unpin_message**: Unpin a message
- **waha_clear_chat_messages**: Clear all messages from a chat
- **waha_delete_chat**: Delete a chat completely
- **waha_star_message**: Star or unstar a message

### 📁 Chat Management (6 tools)
- **waha_archive_chat**: Archive a chat
- **waha_unarchive_chat**: Unarchive a chat
- **waha_mark_chat_unread**: Mark a chat as unread
- **waha_get_chat_picture**: Get chat profile picture
- **waha_react_to_message**: React to a message with emoji

### 📨 Rich Media (6 tools)
- **waha_send_media**: Send images, videos, or documents
- **waha_send_audio**: Send audio/voice messages
- **waha_send_location**: Send location coordinates
- **waha_send_contact**: Send contact cards (vCard)

### 📊 Polls (2 tools)
- **waha_send_poll**: Send polls with single or multiple answer options
- **waha_send_poll_vote**: Vote on existing polls

### 📸 Status/Stories (4 tools)
- **waha_send_text_status**: Send text status with custom styling
- **waha_send_media_status**: Send image/video status
- **waha_get_statuses**: Get available statuses from contacts
- **waha_delete_status**: Delete your own status

### 👥 Group Management (18 tools)
- **waha_get_groups**: List all groups with pagination
- **waha_get_group_info**: Get detailed group information
- **waha_create_group**: Create a new group
- **waha_get_group_picture**: Get group profile picture
- **waha_set_group_picture**: Set group profile picture
- **waha_delete_group_picture**: Remove group picture
- **waha_update_group_subject**: Update group name
- **waha_update_group_description**: Update group description
- **waha_leave_group**: Leave a group
- **waha_get_group_participants**: List group members
- **waha_add_group_participants**: Add members to group
- **waha_remove_group_participants**: Remove members from group
- **waha_promote_group_admin**: Promote members to admin
- **waha_demote_group_admin**: Demote admins
- **waha_get_group_invite_code**: Get group invite link
- **waha_revoke_group_invite_code**: Revoke and generate new invite link
- **waha_join_group**: Join group via invite code
- **waha_get_group_join_info**: Get group info from invite code
- **waha_set_group_messages_admin_only**: Restrict messaging to admins
- **waha_set_group_info_admin_only**: Restrict info changes to admins
- **waha_get_groups_count**: Get total group count

### 👤 Contact Management (7 tools)
- **waha_get_contact**: Get contact information
- **waha_get_all_contacts**: List all contacts with pagination
- **waha_check_contact_exists**: Check if phone number is on WhatsApp
- **waha_get_contact_about**: Get contact's status/about text
- **waha_get_contact_profile_picture**: Get contact's profile picture
- **waha_block_contact**: Block a contact
- **waha_unblock_contact**: Unblock a contact

### 🏷️ Labels (WhatsApp Business) (7 tools)
- **waha_get_labels**: Get all available labels
- **waha_get_chat_labels**: Get labels assigned to a chat
- **waha_put_chat_labels**: Assign labels to a chat
- **waha_delete_chat_label**: Remove label from a chat
- **waha_get_message_labels**: Get labels on a message
- **waha_put_message_labels**: Assign labels to a message
- **waha_delete_message_label**: Remove label from a message

### 👤 Profile Management (4 tools)
- **waha_set_my_profile_name**: Set your WhatsApp display name
- **waha_set_my_profile_status**: Set your About text
- **waha_set_my_profile_picture**: Upload/update profile picture
- **waha_delete_my_profile_picture**: Remove profile picture

### 👁️ Presence/Status (4 tools)
- **waha_get_presence**: Get presence info for a chat
- **waha_subscribe_presence**: Subscribe to presence updates
- **waha_set_presence**: Set your presence (online, typing, etc.)
- **waha_get_all_presence**: Get all subscribed presence info

### 🔐 Session Management (13 tools)
- **waha_list_sessions**: List all WhatsApp sessions
- **waha_get_session**: Get detailed session information
- **waha_create_session**: Create a new session with configuration
- **waha_start_session**: Start a stopped session
- **waha_stop_session**: Stop a running session
- **waha_restart_session**: Restart a session
- **waha_logout_session**: Logout and clear authentication
- **waha_delete_session**: Permanently delete a session
- **waha_get_session_me**: Get authenticated account info
- **waha_get_qr_code**: Get QR code for authentication
- **waha_request_pairing_code**: Request pairing code for phone auth
- **waha_get_screenshot**: Get session screenshot (WEBJS only)

---

### Example: waha_send_poll
Send a poll to a WhatsApp chat with multiple options:

```json
{
  "chatId": "1234567890@c.us",
  "poll": {
    "name": "What's your favorite programming language?",
    "options": ["Python", "JavaScript", "TypeScript", "Go"],
    "multipleAnswers": false
  }
}
```

### Example: waha_create_session
Create a new WhatsApp session with webhook configuration:

```json
{
  "name": "my-session",
  "start": true,
  "config": {
    "webhooks": [{
      "url": "https://your-webhook-url.com",
      "events": ["message", "message.ack", "session.status"]
    }],
    "metadata": {
      "user_id": "123",
      "department": "support"
    }
  }
}
```

### Example: waha_set_my_profile_picture
Update your WhatsApp profile picture:

```json
{
  "file": {
    "url": "https://example.com/my-profile-pic.jpg",
    "mimetype": "image/jpeg"
  }
}
```

Or using base64:

```json
{
  "file": {
    "data": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
    "mimetype": "image/png"
  }
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
