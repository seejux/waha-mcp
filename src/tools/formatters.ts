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
