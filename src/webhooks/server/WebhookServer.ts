import express, { Express, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import type { Server } from "http";
import type { WAHAWebhookPayload } from "../types.js";

/**
 * Event handler callback type
 */
export type WebhookEventHandler = (payload: WAHAWebhookPayload) => Promise<void>;

/**
 * Webhook HTTP Server
 * Receives WAHA webhook POST requests and dispatches to event handlers
 */
export class WebhookServer {
  private app: Express;
  private server: Server | null = null;
  private port: number;
  private hmacKey?: string;
  private eventHandlers: Map<string, WebhookEventHandler[]> = new Map();

  constructor(port: number, hmacKey?: string) {
    this.port = port;
    this.hmacKey = hmacKey;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Parse JSON with raw body for HMAC validation
    this.app.use(
      express.json({
        verify: (req: any, res, buf) => {
          req.rawBody = buf.toString();
        },
      })
    );

    // Request logging
    this.app.use((req, res, next) => {
      console.error(`[WebhookServer] ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Main webhook endpoint
    this.app.post("/webhook", async (req: Request, res: Response) => {
      try {
        // Validate HMAC if configured
        if (this.hmacKey) {
          const isValid = this.validateHmac(
            (req as any).rawBody,
            req.headers["x-webhook-hmac"] as string
          );

          if (!isValid) {
            console.error("[WebhookServer] HMAC validation failed");
            res.status(401).json({ error: "Invalid HMAC signature" });
            return;
          }
        }

        // Parse webhook payload
        const payload: WAHAWebhookPayload = req.body;

        if (!payload || !payload.event) {
          console.error("[WebhookServer] Invalid payload");
          res.status(400).json({ error: "Invalid webhook payload" });
          return;
        }

        console.error(
          `[WebhookServer] Received event: ${payload.event} from session: ${payload.session}`
        );

        // Dispatch to handlers
        await this.dispatchEvent(payload);

        // Send success response
        res.json({ success: true, received: payload.event });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[WebhookServer] Error processing webhook: ${errorMessage}`);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: "Not found" });
    });
  }

  /**
   * Validate HMAC signature
   */
  private validateHmac(body: string, signature?: string): boolean {
    if (!this.hmacKey || !signature) {
      console.error("[WebhookServer] HMAC validation skipped:");
      console.error(`  Has HMAC Key configured: ${!!this.hmacKey}`);
      console.error(`  Has signature in request: ${!!signature}`);
      return false;
    }

    try {
      const expectedHmac = createHmac("sha256", this.hmacKey)
        .update(body)
        .digest("hex");

      console.error("[WebhookServer] HMAC Debug:");
      console.error(`  Received Signature: ${signature}`);
      console.error(`  Expected Signature: ${expectedHmac}`);
      console.error(`  HMAC Key Length: ${this.hmacKey.length}`);
      console.error(`  Body Length: ${body.length}`);
      console.error(`  Body Sample: ${body.substring(0, 150)}`);

      const expectedBuffer = Buffer.from(expectedHmac);
      const receivedBuffer = Buffer.from(signature);

      // Timing-safe comparison
      if (expectedBuffer.length !== receivedBuffer.length) {
        console.error("[WebhookServer] HMAC length mismatch:");
        console.error(`  Expected length: ${expectedBuffer.length}`);
        console.error(`  Received length: ${receivedBuffer.length}`);
        return false;
      }

      const isValid = timingSafeEqual(expectedBuffer, receivedBuffer);
      console.error(`[WebhookServer] HMAC validation result: ${isValid}`);
      return isValid;
    } catch (error) {
      console.error("[WebhookServer] HMAC validation error:", error);
      return false;
    }
  }

  /**
   * Register event handler
   */
  on(event: string, handler: WebhookEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Register handler for all events
   */
  onAll(handler: WebhookEventHandler): void {
    this.on("*", handler);
  }

  /**
   * Dispatch event to registered handlers
   */
  private async dispatchEvent(payload: WAHAWebhookPayload): Promise<void> {
    // Get handlers for specific event
    const specificHandlers = this.eventHandlers.get(payload.event) || [];

    // Get wildcard handlers
    const wildcardHandlers = this.eventHandlers.get("*") || [];

    // Combine all handlers
    const allHandlers = [...specificHandlers, ...wildcardHandlers];

    if (allHandlers.length === 0) {
      console.error(`[WebhookServer] No handlers registered for event: ${payload.event}`);
      return;
    }

    // Execute all handlers
    await Promise.all(
      allHandlers.map(async (handler) => {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`[WebhookServer] Handler error:`, error);
        }
      })
    );
  }

  /**
   * Start the webhook server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.error(`[WebhookServer] Listening on port ${this.port}`);
          resolve();
        });

        this.server.on("error", (error) => {
          console.error("[WebhookServer] Server error:", error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the webhook server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server!.close((error) => {
          if (error) {
            console.error("[WebhookServer] Error stopping server:", error);
            reject(error);
          } else {
            console.error("[WebhookServer] Server stopped");
            this.server = null;
            resolve();
          }
        });
      });
    }
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null;
  }
}
