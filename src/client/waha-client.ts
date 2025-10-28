import type {
  ChatOverview,
  GetChatsOverviewParams,
  GetMessagesParams,
  MarkChatAsReadParams,
  Message,
  SendMessageResponse,
  SendTextMessageParams,
  WAHAErrorResponse,
} from "../types/waha.js";

/**
 * Custom error class for WAHA API errors
 */
export class WAHAError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "WAHAError";
  }
}

/**
 * WAHA API Client
 * Handles all HTTP communication with WAHA WhatsApp HTTP API
 */
export class WAHAClient {
  private baseUrl: string;
  private apiKey: string;
  private session: string;

  constructor(baseUrl: string, apiKey: string, session: string = "default") {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.session = session;
  }

  /**
   * Make an HTTP request to WAHA API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "X-Api-Key": this.apiKey,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle non-2xx responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = await response.json() as WAHAErrorResponse;
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If we can't parse error JSON, use the status text
        }

        throw new WAHAError(errorMessage, response.status);
      }

      // Parse successful response
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof WAHAError) {
        throw error;
      }

      // Handle network errors or other fetch errors
      const message = error instanceof Error ? error.message : String(error);
      throw new WAHAError(
        `Failed to connect to WAHA API: ${message}`,
        undefined,
        error
      );
    }
  }

  /**
   * Build query string from params object
   */
  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    }

    const qs = searchParams.toString();
    return qs ? `?${qs}` : "";
  }

  /**
   * Get chats overview
   * GET /api/:session/chats/overview
   */
  async getChatsOverview(
    params: GetChatsOverviewParams = {}
  ): Promise<ChatOverview[]> {
    const { limit = 10, offset, ids } = params;

    const queryParams: Record<string, any> = {
      limit: Math.min(limit, 100), // Max 100
      offset,
    };

    if (ids && ids.length > 0) {
      queryParams.ids = ids;
    }

    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/${this.session}/chats/overview${queryString}`;

    return this.request<ChatOverview[]>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Get messages from a chat
   * GET /api/:session/chats/:chatId/messages
   */
  async getChatMessages(params: GetMessagesParams): Promise<Message[]> {
    const {
      chatId,
      limit = 10,
      offset,
      downloadMedia = false,
      filters,
    } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    const queryParams: Record<string, any> = {
      limit: Math.min(limit, 100), // Max 100
      offset,
      downloadMedia,
    };

    // Add filters if provided
    if (filters) {
      if (filters.timestampLte !== undefined) {
        queryParams["filter.timestamp.lte"] = filters.timestampLte;
      }
      if (filters.timestampGte !== undefined) {
        queryParams["filter.timestamp.gte"] = filters.timestampGte;
      }
      if (filters.fromMe !== undefined) {
        queryParams["filter.fromMe"] = filters.fromMe;
      }
      if (filters.ack !== undefined) {
        queryParams["filter.ack"] = filters.ack;
      }
    }

    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/messages${queryString}`;

    return this.request<Message[]>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Send a text message
   * POST /api/sendText
   */
  async sendTextMessage(
    params: SendTextMessageParams
  ): Promise<SendMessageResponse> {
    const { chatId, text, session, reply_to, linkPreview, linkPreviewHighQuality } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (!text) {
      throw new WAHAError("text is required");
    }

    const body = {
      chatId,
      text,
      session: session || this.session,
      reply_to,
      linkPreview: linkPreview !== false, // Default true
      linkPreviewHighQuality: linkPreviewHighQuality || false,
    };

    return this.request<SendMessageResponse>("/api/sendText", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Mark messages in a chat as read
   * POST /api/:session/chats/:chatId/messages/read
   */
  async markChatAsRead(params: MarkChatAsReadParams): Promise<void> {
    const { chatId, messages = 30, days = 7 } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    const queryParams = {
      messages,
      days,
    };

    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/messages/read${queryString}`;

    await this.request<void>(endpoint, {
      method: "POST",
    });
  }

  /**
   * Update session webhook configuration
   * PUT /api/sessions/:session
   */
  async updateSessionWebhook(webhookConfig: {
    url: string;
    events: string[];
    hmacKey?: string;
  }): Promise<void> {
    const body: any = {
      config: {
        webhooks: [
          {
            url: webhookConfig.url,
            events: webhookConfig.events,
          },
        ],
      },
    };

    // Add HMAC if provided
    if (webhookConfig.hmacKey) {
      body.config.webhooks[0].hmac = {
        key: webhookConfig.hmacKey,
      };
      console.error(`[WAHAClient] HMAC key configured: ${webhookConfig.hmacKey.substring(0, 4)}...${webhookConfig.hmacKey.substring(webhookConfig.hmacKey.length - 4)} (length: ${webhookConfig.hmacKey.length})`);
    } else {
      console.error("[WAHAClient] No HMAC key provided");
    }

    const endpoint = `/api/sessions/${this.session}`;

    console.error(`[WAHAClient] Sending webhook config to endpoint: ${endpoint}`);
    console.error(`[WAHAClient] Webhook URL: ${body.config.webhooks[0].url}`);
    console.error(`[WAHAClient] Webhook events: ${body.config.webhooks[0].events.join(", ")}`);
    if (body.config.webhooks[0].hmac) {
      console.error(`[WAHAClient] HMAC enabled: yes`);
    }

    await this.request<void>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    console.error(`[WAHAClient] Webhook configured: ${webhookConfig.url}`);
  }

  /**
   * Validate chat ID format
   */
  static validateChatId(chatId: string): boolean {
    // Chat ID should be in format: number@c.us (individual) or number@g.us (group)
    return /^\d+@(c|g)\.us$/.test(chatId);
  }
}
