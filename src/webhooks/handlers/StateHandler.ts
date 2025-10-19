import { BaseEventHandler } from "./BaseEventHandler.js";
import type { WAHAWebhookPayload, StateChangeEventPayload } from "../types.js";

/**
 * Handles session state change events
 * Emits MCP notifications when WhatsApp session status changes
 */
export class StateHandler extends BaseEventHandler {
  canHandle(eventType: string): boolean {
    return eventType === "state.change";
  }

  async handle(payload: WAHAWebhookPayload): Promise<void> {
    const stateData = payload.payload as StateChangeEventPayload;

    // Build notification data
    const notificationData = {
      type: "waha/state",
      data: {
        session: payload.session,
        state: stateData.state,
        reason: stateData.reason,
        timestamp: new Date().toISOString(),
      },
    };

    // Log the state change
    console.error(
      `[StateHandler] Session ${payload.session} state changed to: ${stateData.state}${stateData.reason ? ` (${stateData.reason})` : ""}`
    );

    // Emit MCP notification
    await this.emitNotification(notificationData);
  }
}
