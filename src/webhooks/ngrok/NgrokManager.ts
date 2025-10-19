import ngrok from "@ngrok/ngrok";

/**
 * Manages ngrok tunnel lifecycle
 * Creates and maintains public URL for local webhook server
 */
export class NgrokManager {
  private listener: any = null;
  private publicUrl: string | null = null;
  private port: number;
  private authToken?: string;

  constructor(port: number, authToken?: string) {
    this.port = port;
    this.authToken = authToken;
  }

  /**
   * Start ngrok tunnel
   * @returns Public ngrok URL
   */
  async start(): Promise<string> {
    try {
      console.error(`[NgrokManager] Starting tunnel for port ${this.port}...`);

      // Build ngrok options
      const options: any = {
        addr: this.port,
        authtoken_from_env: true,
      };

      // Use authtoken if provided
      if (this.authToken) {
        options.authtoken = this.authToken;
      }

      // Start ngrok tunnel
      this.listener = await ngrok.forward(options);

      const url = this.listener.url();
      if (!url) {
        throw new Error("Failed to get ngrok URL");
      }

      this.publicUrl = url;
      console.error(`[NgrokManager] Tunnel started: ${url}`);

      return url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[NgrokManager] Failed to start tunnel: ${errorMessage}`);
      throw new Error(`Failed to start ngrok tunnel: ${errorMessage}`);
    }
  }

  /**
   * Stop ngrok tunnel
   */
  async stop(): Promise<void> {
    if (this.listener) {
      try {
        console.error("[NgrokManager] Stopping tunnel...");
        await this.listener.close();
        this.listener = null;
        this.publicUrl = null;
        console.error("[NgrokManager] Tunnel stopped");
      } catch (error) {
        console.error("[NgrokManager] Error stopping tunnel:", error);
      }
    }
  }

  /**
   * Get current public URL
   */
  getPublicUrl(): string | null {
    return this.publicUrl;
  }

  /**
   * Check if tunnel is active
   */
  isActive(): boolean {
    return this.listener !== null && this.publicUrl !== null;
  }

  /**
   * Get full webhook URL with path
   */
  getWebhookUrl(path: string = "/webhook"): string | null {
    if (!this.publicUrl) {
      return null;
    }
    return `${this.publicUrl}${path}`;
  }
}
