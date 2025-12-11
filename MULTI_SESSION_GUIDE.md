# Multi-Session Support Guide

## Overview

The WAHA MCP Server now supports managing **multiple WhatsApp sessions** simultaneously. This enables powerful use cases like:

- Managing personal and business WhatsApp accounts from one place
- Bulk operations across multiple accounts (e.g., update all profile pictures)
- Session monitoring and management
- Different configurations per account

## How It Works

### Configuration

The `WAHA_SESSION` environment variable is now **optional** and serves as a default:

```bash
# .env file
WAHA_BASE_URL=https://your-waha-server.com
WAHA_API_KEY=your-api-key
WAHA_SESSION=default  # Optional: used when session not specified in tool calls
```

### Architecture Changes

**Before (Single Session):**
```typescript
// Client held session in constructor
const client = new WAHAClient(baseUrl, apiKey, "default");
await client.getChatsOverview({ limit: 10 });
```

**After (Multi-Session):**
```typescript
// Client doesn't hold session - passed per call
const client = new WAHAClient(baseUrl, apiKey);
await client.getChatsOverview("default", { limit: 10 });
await client.getChatsOverview("business", { limit: 10 });
```

## Usage Examples

### 1. Using Default Session

When you don't specify a `session` parameter, the tool uses `WAHA_SESSION` from your environment:

```json
{
  "name": "waha_get_chats",
  "arguments": {
    "limit": 10
  }
}
```

### 2. Using Specific Session

Specify which session to use in the `session` parameter:

```json
{
  "name": "waha_get_chats",
  "arguments": {
    "session": "business",
    "limit": 10
  }
}
```

### 3. Managing Multiple Sessions

#### List All Sessions
```json
{
  "name": "waha_list_sessions",
  "arguments": {
    "all": true
  }
}
```

#### Get Session Details
```json
{
  "name": "waha_get_session",
  "arguments": {
    "session": "personal"
  }
}
```

#### Create New Session
```json
{
  "name": "waha_create_session",
  "arguments": {
    "name": "business",
    "start": false,
    "config": {
      "metadata": {
        "user_id": "123",
        "account_type": "business"
      }
    }
  }
}
```

### 4. Bulk Operations Across Sessions

**Scenario:** Update profile pictures for all accounts

```javascript
// Step 1: Get all sessions
const sessions = await listSessions({ all: true });

// Step 2: For each session, update profile picture
for (const session of sessions) {
  if (session.status === "WORKING") {
    await setMyProfilePicture({
      session: session.name,
      file: {
        url: "https://example.com/new-profile-pic.jpg",
        mimetype: "image/jpeg"
      }
    });
  }
}
```

**Scenario:** Send message from multiple accounts

```javascript
const message = "Hello from WAHA!";
const recipientId = "1234567890@c.us";

// Send from personal account
await sendMessage({
  session: "personal",
  chatId: recipientId,
  text: message
});

// Send from business account  
await sendMessage({
  session: "business",
  chatId: recipientId,
  text: message
});
```

### 5. Session Management Workflow

```json
// Create session
{
  "name": "waha_create_session",
  "arguments": {
    "name": "customer_support",
    "start": true
  }
}

// Get QR code for authentication
{
  "name": "waha_get_qr_code",
  "arguments": {
    "session": "customer_support"
  }
}

// Check authentication status
{
  "name": "waha_get_session_me",
  "arguments": {
    "session": "customer_support"
  }
}

// Start using the session
{
  "name": "waha_send_message",
  "arguments": {
    "session": "customer_support",
    "chatId": "1234567890@c.us",
    "text": "Hello! How can I help you?"
  }
}
```

## All Tools Support Session Parameter

Every tool in the WAHA MCP Server accepts an optional `session` parameter:

### Session Management (13 tools)
- `waha_list_sessions`
- `waha_get_session`
- `waha_create_session`
- `waha_start_session`
- `waha_stop_session`
- `waha_restart_session`
- `waha_logout_session`
- `waha_delete_session`
- `waha_get_session_me`
- `waha_get_qr_code`
- `waha_request_pairing_code`
- `waha_get_screenshot`

### Message Operations (15+ tools)
- `waha_get_chats`
- `waha_get_messages`
- `waha_send_message`
- `waha_mark_chat_read`
- `waha_delete_message`
- `waha_edit_message`
- `waha_pin_message`
- `waha_unpin_message`
- `waha_react_to_message`
- `waha_star_message`
- And more...

### Profile Management (4 tools)
- `waha_set_my_profile_name`
- `waha_set_my_profile_status`
- `waha_set_my_profile_picture`
- `waha_delete_my_profile_picture`

### Group Management (21 tools)
- `waha_get_groups`
- `waha_create_group`
- `waha_add_group_participants`
- And 18 more...

### And More Categories
- Polls (2 tools)
- Status/Stories (4 tools)
- Labels (7 tools)
- Contacts (7 tools)
- Presence (4 tools)
- Rich Media (6+ tools)

## Benefits

✅ **Multi-Account Management**: Handle personal, business, and other accounts from one server  
✅ **Bulk Operations**: Execute operations across all sessions efficiently  
✅ **Flexible Routing**: Choose which account handles which conversation  
✅ **Session Isolation**: Each session has independent configuration and state  
✅ **Backwards Compatible**: Omitting `session` parameter uses default from `WAHA_SESSION`  

## Technical Details

### Implementation
- **WAHAClient**: All methods accept `session` as first parameter
- **Config**: `wahaDefaultSession` provides fallback
- **Tools**: All 74+ tools accept optional `session` argument
- **Resources**: Support session via URI query params (e.g., `waha://chats/overview?session=business`)
- **WebhookManager**: Uses default session for webhook configuration

### Error Handling
- If session doesn't exist: WAHA API returns appropriate error
- If session not authenticated: Tools return clear error messages
- All errors include session name for easy debugging

## Testing

Run the architecture validation test:

```bash
npm run build
node test_architecture.js
```

This validates:
- ✅ Config structure
- ✅ WAHAClient constructor
- ✅ Method signatures
- ✅ Tool definitions

## Questions?

See the main [README.md](./README.md) for general documentation or [CLAUDE.md](./CLAUDE.md) for implementation details.
