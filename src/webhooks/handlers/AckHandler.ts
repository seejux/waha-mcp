import { BaseEventHandler } from "./BaseEventHandler.js";
import type { WAHAWebhookPayload, AckEventPayload } from "../types.js";

/**
 * Handles message acknowledgment (delivery/read status) events
 * Emits MCP notifications when message status changes
 */
export class AckHandler extends BaseEventHandler {
  canHandle(eventType: string): boolean {
    return eventType === "message.ack";
  }

  async handle(payload: WAHAWebhookPayload): Promise<void> {
    const ackData = payload.payload as AckEventPayload;

    // Extract chat ID
    const chatId = this.extractChatId(ackData.from, ackData.to, ackData.fromMe);

    // Build notification data
    const notificationData = {
      type: "waha/ack",
      data: {
        session: payload.session,
        messageId: ackData.id,
        chatId,
        status: ackData.ack,
        statusName: ackData.ackName,
        fromMe: ackData.fromMe,
      },
    };

    // Log the acknowledgment
    console.error(
      `[AckHandler] Message ${ackData.id} status changed to: ${ackData.ackName} in chat ${chatId}`
    );

    // Emit MCP notification
    await this.emitNotification(notificationData);
  }
}
