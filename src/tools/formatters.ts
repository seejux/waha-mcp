import type { ChatOverview, Message } from "../types/index.js";

/**
 * Format timestamp to human-readable date/time
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

/**
 * Format chat overview for LLM consumption
 */
export function formatChatOverview(chat: ChatOverview): string {
  const lines: string[] = [];

  lines.push(`Chat ID: ${chat.id}`);
  lines.push(`Name: ${chat.name}`);

  if (chat.isGroup) {
    lines.push(`Type: Group`);
  }

  if (chat.unreadCount && chat.unreadCount > 0) {
    lines.push(`Unread: ${chat.unreadCount} message${chat.unreadCount > 1 ? 's' : ''}`);
  }

  if (chat.lastMessage) {
    lines.push(`Last Message: "${chat.lastMessage.body || '(media)'}"`);
    lines.push(`  From: ${chat.lastMessage.fromMe ? 'Me' : chat.name}`);
    lines.push(`  Time: ${formatTimestamp(chat.lastMessage.timestamp)}`);
  }

  if (chat.archived) {
    lines.push(`Status: Archived`);
  }

  return lines.join('\n');
}

/**
 * Format multiple chats overview
 */
export function formatChatsOverview(chats: ChatOverview[]): string {
  if (chats.length === 0) {
    return "No chats found.";
  }

  const sections = chats.map((chat, index) => {
    return `\n[Chat ${index + 1}]\n${formatChatOverview(chat)}`;
  });

  return `Found ${chats.length} chat${chats.length > 1 ? 's' : ''}:\n${sections.join('\n')}`;
}

/**
 * Format a single message for LLM consumption
 */
export function formatMessage(message: Message): string {
  const lines: string[] = [];

  lines.push(`Message ID: ${message.id}`);
  lines.push(`Time: ${formatTimestamp(message.timestamp)}`);
  lines.push(`From: ${message.fromMe ? 'Me' : (message.from || 'Unknown')}`);

  if (message.body) {
    lines.push(`Text: "${message.body}"`);
  }

  if (message.hasMedia) {
    lines.push(`Media: Yes${message.caption ? ` (caption: "${message.caption}")` : ''}`);
  }

  if (message.quotedMsg) {
    lines.push(`Reply to: ${message.quotedMsg}`);
  }

  if (message.ack) {
    lines.push(`Status: ${message.ack}`);
  }

  if (message.isForwarded) {
    lines.push(`Forwarded: Yes`);
  }

  return lines.join('\n');
}

/**
 * Format multiple messages
 */
export function formatMessages(messages: Message[]): string {
  if (messages.length === 0) {
    return "No messages found.";
  }

  const sections = messages.map((msg, index) => {
    return `\n[Message ${index + 1}]\n${formatMessage(msg)}`;
  });

  return `Found ${messages.length} message${messages.length > 1 ? 's' : ''}:\n${sections.join('\n')}`;
}

/**
 * Format send message success response
 */
export function formatSendMessageSuccess(chatId: string, messageId: string, timestamp: number): string {
  return `Message sent successfully!\nChat: ${chatId}\nMessage ID: ${messageId}\nTime: ${formatTimestamp(timestamp)}`;
}

/**
 * Truncate text to max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format session information
 */
export function formatSession(session: any): string {
  const lines: string[] = [];

  lines.push(`Session: ${session.name}`);
  lines.push(`Status: ${session.status}`);
  
  if (session.me) {
    lines.push(`Account: ${session.me.pushName || 'Unknown'} (${session.me.id})`);
  }

  if (session.engine) {
    lines.push(`Engine: ${session.engine.engine || 'Unknown'}`);
  }

  if (session.metadata && Object.keys(session.metadata).length > 0) {
    lines.push(`Metadata: ${JSON.stringify(session.metadata, null, 2)}`);
  }

  if (session.config?.webhooks && session.config.webhooks.length > 0) {
    lines.push(`Webhooks: ${session.config.webhooks.length} configured`);
  }

  return lines.join('\n');
}

/**
 * Format multiple sessions
 */
export function formatSessions(sessions: any[]): string {
  if (sessions.length === 0) {
    return "No sessions found.";
  }

  const sections = sessions.map((session, index) => {
    return `\n[Session ${index + 1}]\n${formatSession(session)}`;
  });

  return `Found ${sessions.length} session${sessions.length > 1 ? 's' : ''}:\n${sections.join('\n')}`;
}

/**
 * Format poll send success
 */
export function formatPollSuccess(chatId: string, messageId: string): string {
  return `Poll sent successfully!\nChat: ${chatId}\nPoll Message ID: ${messageId}\n\nSave this message ID to track votes via webhook events.`;
}

/**
 * Format status list
 */
export function formatStatuses(statuses: any[]): string {
  if (statuses.length === 0) {
    return "No statuses found.";
  }

  const sections = statuses.map((status, index) => {
    const lines: string[] = [];
    lines.push(`[Status ${index + 1}]`);
    lines.push(`From: ${status.from || 'Unknown'}`);
    if (status.text) lines.push(`Text: "${status.text}"`);
    if (status.mediaUrl) lines.push(`Media: ${status.mediaUrl}`);
    if (status.timestamp) lines.push(`Time: ${formatTimestamp(status.timestamp)}`);
    return lines.join('\n');
  });

  return `Found ${statuses.length} status${statuses.length > 1 ? 'es' : ''}:\n\n${sections.join('\n\n')}`;
}

/**
 * Format labels list
 */
export function formatLabels(labels: any[]): string {
  if (labels.length === 0) {
    return "No labels found.";
  }

  const sections = labels.map((label, index) => {
    return `[${index + 1}] ${label.name || 'Unnamed'} (ID: ${label.id}) ${label.color ? `- Color: ${label.color}` : ''}`;
  });

  return `Found ${labels.length} label${labels.length > 1 ? 's' : ''}:\n${sections.join('\n')}`;
}

/**
 * Format groups list
 */
export function formatGroups(groups: any[]): string {
  if (groups.length === 0) {
    return "No groups found.";
  }

  const sections = groups.map((group, index) => {
    const lines: string[] = [];
    lines.push(`[Group ${index + 1}]`);
    lines.push(`ID: ${group.id}`);
    lines.push(`Name: ${group.name || 'Unnamed Group'}`);
    if (group.description) lines.push(`Description: ${truncate(group.description, 100)}`);
    if (group.size !== undefined) lines.push(`Members: ${group.size}`);
    return lines.join('\n');
  });

  return `Found ${groups.length} group${groups.length > 1 ? 's' : ''}:\n\n${sections.join('\n\n')}`;
}

/**
 * Format contacts list
 */
export function formatContacts(contacts: any[]): string {
  if (contacts.length === 0) {
    return "No contacts found.";
  }

  const sections = contacts.map((contact, index) => {
    const lines: string[] = [];
    lines.push(`[Contact ${index + 1}]`);
    lines.push(`ID: ${contact.id}`);
    if (contact.name) lines.push(`Name: ${contact.name}`);
    if (contact.pushname) lines.push(`Push Name: ${contact.pushname}`);
    if (contact.number) lines.push(`Number: ${contact.number}`);
    return lines.join('\n');
  });

  return `Found ${contacts.length} contact${contacts.length > 1 ? 's' : ''}:\n\n${sections.join('\n\n')}`;
}

/**
 * Format simple success message
 */
export function formatSuccess(action: string, details?: string): string {
  if (details) {
    return `✓ ${action} completed successfully.\n${details}`;
  }
  return `✓ ${action} completed successfully.`;
}
