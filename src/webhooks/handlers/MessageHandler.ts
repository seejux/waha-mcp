import { BaseEventHandler } from "./BaseEventHandler.js";
import type { WAHAWebhookPayload, MessageEventPayload, WAHAEventType } from "../types.js";

/**
 * Handles incoming message events from WAHA
 * Emits MCP notifications when new WhatsApp messages arrive
 */
export class MessageHandler extends BaseEventHandler {
  canHandle(eventType: string): boolean {
    return eventType === "message" || eventType === "message.any";
  }

  async handle(payload: WAHAWebhookPayload): Promise<void> {
    const messageData = payload.payload as MessageEventPayload;

    // Extract chat ID
    const chatId = this.extractChatId(messageData.from, messageData.to, messageData.fromMe);

    // Build notification data
    const notificationData = {
      type: "waha/message",
      data: {
        session: payload.session,
        messageId: messageData.id,
        chatId,
        from: messageData.fromMe ? "Me" : messageData.from,
        fromMe: messageData.fromMe,
        text: messageData.body || (messageData.hasMedia ? "[Media]" : "[No content]"),
        timestamp: this.formatTimestamp(messageData.timestamp),
        timestampRaw: messageData.timestamp,
        hasMedia: messageData.hasMedia || false,
        mediaUrl: messageData.mediaUrl,
        ackStatus: messageData.ack || "PENDING",
        replyTo: messageData.replyTo
          ? {
              id: messageData.replyTo.id,
              body: messageData.replyTo.body,
            }
          : undefined,
      },
    };

    // Log the message
    console.error(
      `[MessageHandler] New message in ${chatId} from ${notificationData.data.from}: ${this.truncate(notificationData.data.text, 50)}`
    );

    // Emit MCP notification
    await this.emitNotification(notificationData);
  }
}
