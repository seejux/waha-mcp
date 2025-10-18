/**
 * WAHA API Type Definitions
 * Based on WAHA WhatsApp HTTP API specification
 */

/**
 * Message acknowledgment status
 */
export enum MessageAck {
  ERROR = "ERROR",
  PENDING = "PENDING",
  SERVER = "SERVER",
  DEVICE = "DEVICE",
  READ = "READ",
  PLAYED = "PLAYED",
}

/**
 * Chat ID format: number@c.us for individual, number@g.us for groups
 */
export type ChatId = string;

/**
 * Message ID format
 */
export type MessageId = string;

/**
 * Chat overview information
 */
export interface ChatOverview {
  id: ChatId;
  name: string;
  picture?: string;
  lastMessage?: {
    id: MessageId;
    timestamp: number;
    body?: string;
    fromMe: boolean;
  };
  timestamp: number;
  unreadCount?: number;
  isGroup?: boolean;
  archived?: boolean;
}

/**
 * Detailed message information
 */
export interface Message {
  id: MessageId;
  chatId: ChatId;
  timestamp: number;
  body?: string;
  fromMe: boolean;
  from?: string;
  to?: string;
  ack?: MessageAck;
  hasMedia?: boolean;
  mediaUrl?: string;
  caption?: string;
  quotedMsg?: MessageId;
  mentionedIds?: string[];
  isForwarded?: boolean;
  broadcast?: boolean;
  links?: Array<{
    link: string;
    isSuspicious: boolean;
  }>;
}

/**
 * Request parameters for getting chats overview
 */
export interface GetChatsOverviewParams {
  limit?: number;
  offset?: number;
  ids?: ChatId[];
}

/**
 * Request parameters for getting messages
 */
export interface GetMessagesParams {
  chatId: ChatId;
  limit?: number;
  offset?: number;
  downloadMedia?: boolean;
  filters?: {
    timestampLte?: number;
    timestampGte?: number;
    fromMe?: boolean;
    ack?: MessageAck;
  };
}

/**
 * Request parameters for sending text message
 */
export interface SendTextMessageParams {
  chatId: ChatId;
  text: string;
  session?: string;
  reply_to?: MessageId;
  linkPreview?: boolean;
  linkPreviewHighQuality?: boolean;
}

/**
 * Request parameters for marking chat as read
 */
export interface MarkChatAsReadParams {
  chatId: ChatId;
  messages?: number;
  days?: number;
}

/**
 * Response from sending a message
 */
export interface SendMessageResponse {
  id: MessageId;
  timestamp: number;
  chatId: ChatId;
}

/**
 * WAHA API Error Response
 */
export interface WAHAErrorResponse {
  error?: string;
  message?: string;
  statusCode?: number;
}

/**
 * Generic API response wrapper
 */
export interface WAHAResponse<T> {
  data?: T;
  error?: WAHAErrorResponse;
}
