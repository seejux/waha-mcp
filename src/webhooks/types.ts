/**
 * Webhook-related type definitions for WAHA events
 */

/**
 * WAHA webhook event types
 */
export enum WAHAEventType {
  MESSAGE = "message",
  MESSAGE_ANY = "message.any",
  MESSAGE_ACK = "message.ack",
  STATE_CHANGE = "state.change",
  GROUP_JOIN = "group.join",
  GROUP_LEAVE = "group.leave",
  PRESENCE_UPDATE = "presence.update",
  POLL_VOTE = "poll.vote",
  POLL_VOTE_FAILED = "poll.vote.failed",
}

/**
 * Message acknowledgment status
 */
export enum AckStatus {
  ERROR = "ERROR",
  PENDING = "PENDING",
  SERVER = "SERVER",
  DEVICE = "DEVICE",
  READ = "READ",
  PLAYED = "PLAYED",
}

/**
 * Session state
 */
export enum SessionState {
  STOPPED = "STOPPED",
  STARTING = "STARTING",
  SCAN_QR_CODE = "SCAN_QR_CODE",
  WORKING = "WORKING",
  FAILED = "FAILED",
}

/**
 * Base webhook payload structure
 */
export interface WAHAWebhookPayload {
  event: WAHAEventType;
  session: string;
  payload: any;
}

/**
 * Message event payload
 */
export interface MessageEventPayload {
  id: string;
  timestamp: number;
  from: string;
  fromMe: boolean;
  to: string;
  body?: string;
  hasMedia?: boolean;
  mediaUrl?: string;
  ack?: AckStatus;
  ackName?: string;
  participant?: string;
  replyTo?: {
    id: string;
    participant?: string;
    body?: string;
  };
}

/**
 * ACK event payload
 */
export interface AckEventPayload {
  id: string;
  from: string;
  to: string;
  participant?: string;
  fromMe: boolean;
  ack: AckStatus;
  ackName: string;
}

/**
 * State change event payload
 */
export interface StateChangeEventPayload {
  state: SessionState;
  reason?: string;
}

/**
 * Group event payload
 */
export interface GroupEventPayload {
  groupId: string;
  participant: string;
  action: "add" | "remove" | "promote" | "demote";
}

/**
 * Presence event payload
 */
export interface PresenceEventPayload {
  id: string;
  isOnline: boolean;
  lastSeen?: number;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  url: string;
  events: WAHAEventType[];
  hmac?: {
    key: string;
  };
  retries?: {
    delaySeconds: number;
    attempts: number;
    policy: "linear" | "exponential";
  };
  customHeaders?: Array<{
    name: string;
    value: string;
  }>;
}

/**
 * MCP Notification data
 */
export interface MCPNotificationData {
  type: string; // e.g., "waha/message", "waha/ack", "waha/state"
  data: any;
}
