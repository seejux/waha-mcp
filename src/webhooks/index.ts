/**
 * Webhooks module exports
 * Central export point for all webhook-related functionality
 */

// Types
export type {
  WAHAWebhookPayload,
  MessageEventPayload,
  AckEventPayload,
  StateChangeEventPayload,
  GroupEventPayload,
  PresenceEventPayload,
  WebhookConfig,
  MCPNotificationData,
} from "./types.js";

export { WAHAEventType, AckStatus, SessionState } from "./types.js";

// Server
export { WebhookServer } from "./server/WebhookServer.js";
export type { WebhookEventHandler } from "./server/WebhookServer.js";

// ngrok
export { NgrokManager } from "./ngrok/NgrokManager.js";

// Handlers
export { BaseEventHandler } from "./handlers/BaseEventHandler.js";
export { MessageHandler } from "./handlers/MessageHandler.js";
export { AckHandler } from "./handlers/AckHandler.js";
export { StateHandler } from "./handlers/StateHandler.js";

// Manager
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { WAHAClient } from "../client/index.js";
import { WebhookServer } from "./server/WebhookServer.js";
import { NgrokManager } from "./ngrok/NgrokManager.js";
import { BaseEventHandler } from "./handlers/BaseEventHandler.js";
import { MessageHandler } from "./handlers/MessageHandler.js";
import { AckHandler } from "./handlers/AckHandler.js";
import { StateHandler } from "./handlers/StateHandler.js";
import { WAHAEventType } from "./types.js";

/**
 * Webhook Manager Configuration
 */
export interface WebhookManagerConfig {
  enabled: boolean;
  port: number;
  hmacKey?: string;
  ngrokAuthToken?: string;
  autoStart: boolean;
}

/**
 * Webhook Manager
 * Orchestrates webhook server, ngrok tunnel, and event handlers
 */
export class WebhookManager {
  private webhookServer: WebhookServer;
  private ngrokManager: NgrokManager;
  private wahaClient: WAHAClient;
  private config: WebhookManagerConfig;
  private handlers: BaseEventHandler[];
  private defaultSession: string;

  constructor(
    mcpServer: Server,
    wahaClient: WAHAClient,
    config: WebhookManagerConfig,
    defaultSession: string
  ) {
    this.wahaClient = wahaClient;
    this.config = config;
    this.defaultSession = defaultSession;

    // Initialize webhook server
    this.webhookServer = new WebhookServer(config.port, config.hmacKey);

    // Initialize ngrok manager
    this.ngrokManager = new NgrokManager(config.port, config.ngrokAuthToken);

    // Initialize event handlers
    this.handlers = [
      new MessageHandler(mcpServer),
      new AckHandler(mcpServer),
      new StateHandler(mcpServer),
    ];

    // Register event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for webhook events
   */
  private setupEventHandlers(): void {
    this.webhookServer.onAll(async (payload) => {
      // Find handler that can process this event
      const handler = this.handlers.find((h) => h.canHandle(payload.event));

      if (handler) {
        await handler.handle(payload);
      } else {
        console.error(`[WebhookManager] No handler found for event: ${payload.event}`);
      }
    });
  }

  /**
   * Start webhook system
   * 1. Start webhook HTTP server
   * 2. Start ngrok tunnel
   * 3. Configure WAHA with webhook URL
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.error("[WebhookManager] Webhooks disabled in configuration");
      return;
    }

    try {
      // Start webhook server
      console.error("[WebhookManager] Starting webhook server...");
      await this.webhookServer.start();

      // Start ngrok tunnel
      console.error("[WebhookManager] Starting ngrok tunnel...");
      const publicUrl = await this.ngrokManager.start();

      // Get webhook URL
      const webhookUrl = this.ngrokManager.getWebhookUrl("/webhook");
      if (!webhookUrl) {
        throw new Error("Failed to get webhook URL from ngrok");
      }

      console.error(`[WebhookManager] Webhook URL: ${webhookUrl}`);

      // Configure WAHA with webhook
      console.error("[WebhookManager] Configuring WAHA session...");
      await this.wahaClient.updateSessionWebhook(this.defaultSession, {
        url: webhookUrl,
        events: [
          WAHAEventType.MESSAGE,
          WAHAEventType.MESSAGE_ACK,
          WAHAEventType.STATE_CHANGE,
        ],
        hmacKey: this.config.hmacKey,
      });

      console.error("[WebhookManager] Webhook system started successfully!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[WebhookManager] Failed to start: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Stop webhook system
   */
  async stop(): Promise<void> {
    console.error("[WebhookManager] Stopping webhook system...");

    try {
      await this.ngrokManager.stop();
      await this.webhookServer.stop();
      console.error("[WebhookManager] Webhook system stopped");
    } catch (error) {
      console.error("[WebhookManager] Error during shutdown:", error);
    }
  }

  /**
   * Check if webhook system is running
   */
  isRunning(): boolean {
    return this.webhookServer.isRunning() && this.ngrokManager.isActive();
  }

  /**
   * Get ngrok public URL
   */
  getPublicUrl(): string | null {
    return this.ngrokManager.getPublicUrl();
  }
}

/**
 * Factory function to create and configure WebhookManager
 */
export function createWebhookManager(
  mcpServer: Server,
  wahaClient: WAHAClient,
  config: WebhookManagerConfig,
  defaultSession: string
): WebhookManager {
  return new WebhookManager(mcpServer, wahaClient, config, defaultSession);
}
