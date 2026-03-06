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
   * Delete a message from a chat
   * DELETE /api/:session/chats/:chatId/messages/:messageId
   */
  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (!messageId) {
      throw new WAHAError("messageId is required");
    }

    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/messages/${encodeURIComponent(messageId)}`;

    await this.request<void>(endpoint, {
      method: "DELETE",
    });
  }

  /**
   * Edit a message in a chat
   * PUT /api/:session/chats/:chatId/messages/:messageId
   */
  async editMessage(params: {
    chatId: string;
    messageId: string;
    text: string;
    linkPreview?: boolean;
    linkPreviewHighQuality?: boolean;
  }): Promise<void> {
    const { chatId, messageId, text, linkPreview, linkPreviewHighQuality } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (!messageId) {
      throw new WAHAError("messageId is required");
    }

    if (!text) {
      throw new WAHAError("text is required");
    }

    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/messages/${encodeURIComponent(messageId)}`;

    const body = {
      text,
      linkPreview: linkPreview !== false,
      linkPreviewHighQuality: linkPreviewHighQuality || false,
    };

    await this.request<void>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * Pin a message in a chat
   * POST /api/:session/chats/:chatId/messages/:messageId/pin
   */
  async pinMessage(params: {
    chatId: string;
    messageId: string;
    duration?: number;
  }): Promise<void> {
    const { chatId, messageId, duration } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (!messageId) {
      throw new WAHAError("messageId is required");
    }

    const queryParams: Record<string, any> = {};
    if (duration !== undefined) {
      queryParams.duration = duration;
    }

    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/messages/${encodeURIComponent(messageId)}/pin${queryString}`;

    await this.request<void>(endpoint, {
      method: "POST",
    });
  }

  /**
   * Unpin a message in a chat
   * POST /api/:session/chats/:chatId/messages/:messageId/unpin
   */
  async unpinMessage(chatId: string, messageId: string): Promise<void> {
    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (!messageId) {
      throw new WAHAError("messageId is required");
    }

    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/messages/${encodeURIComponent(messageId)}/unpin`;

    await this.request<void>(endpoint, {
      method: "POST",
    });
  }

  /**
   * Clear all messages from a chat (destructive operation)
   * DELETE /api/:session/chats/:chatId/messages
   */
  async clearChatMessages(chatId: string): Promise<void> {
    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/messages`;

    await this.request<void>(endpoint, {
      method: "DELETE",
    });
  }

  /**
   * Delete a chat completely (destructive operation)
   * DELETE /api/:session/chats/:chatId
   */
  async deleteChat(chatId: string): Promise<void> {
    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(chatId)}`;

    await this.request<void>(endpoint, {
      method: "DELETE",
    });
  }

  /**
   * Archive a chat
   * POST /api/:session/chats/:chatId/archive
   */
  async archiveChat(chatId: string): Promise<void> {
    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/archive`;

    await this.request<void>(endpoint, {
      method: "POST",
    });
  }

  /**
   * Unarchive a chat
   * POST /api/:session/chats/:chatId/unarchive
   */
  async unarchiveChat(chatId: string): Promise<void> {
    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/unarchive`;

    await this.request<void>(endpoint, {
      method: "POST",
    });
  }

  /**
   * Mark a chat as unread
   * POST /api/:session/chats/:chatId/unread
   */
  async markChatUnread(chatId: string): Promise<void> {
    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/unread`;

    await this.request<void>(endpoint, {
      method: "POST",
    });
  }

  /**
   * Get chat picture URL
   * GET /api/:session/chats/:chatId/picture
   */
  async getChatPicture(params: {
    chatId: string;
    refresh?: boolean;
  }): Promise<{ url: string }> {
    const { chatId, refresh } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    const queryParams: Record<string, any> = {};
    if (refresh !== undefined) {
      queryParams.refresh = refresh;
    }

    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/picture${queryString}`;

    return this.request<{ url: string }>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Send media (image, video, or document)
   * POST /api/sendImage, /api/sendVideo, /api/sendFile
   */
  async sendMedia(params: {
    chatId: string;
    file: {
      mimetype: string;
      url?: string;
      data?: string; // base64
      filename?: string;
    };
    mediaType: "image" | "video" | "document";
    caption?: string;
    reply_to?: string;
  }): Promise<SendMessageResponse> {
    const { chatId, file, mediaType, caption, reply_to } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (!file || (!file.url && !file.data)) {
      throw new WAHAError("file with url or data is required");
    }

    const endpointMap = {
      image: "/api/sendImage",
      video: "/api/sendVideo",
      document: "/api/sendFile",
    };

    const body = {
      chatId,
      file,
      session: this.session,
      caption,
      reply_to,
    };

    return this.request<SendMessageResponse>(endpointMap[mediaType], {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Send audio/voice message
   * POST /api/sendVoice
   */
  async sendAudio(params: {
    chatId: string;
    file: {
      mimetype: string;
      url?: string;
      data?: string; // base64
      filename?: string;
    };
    reply_to?: string;
  }): Promise<SendMessageResponse> {
    const { chatId, file, reply_to } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (!file || (!file.url && !file.data)) {
      throw new WAHAError("file with url or data is required");
    }

    const body = {
      chatId,
      file,
      session: this.session,
      reply_to,
    };

    return this.request<SendMessageResponse>("/api/sendVoice", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Send location
   * POST /api/sendLocation
   */
  async sendLocation(params: {
    chatId: string;
    latitude: number;
    longitude: number;
    title?: string;
    reply_to?: string;
  }): Promise<SendMessageResponse> {
    const { chatId, latitude, longitude, title, reply_to } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (latitude === undefined || longitude === undefined) {
      throw new WAHAError("latitude and longitude are required");
    }

    const body = {
      chatId,
      latitude,
      longitude,
      title,
      session: this.session,
      reply_to,
    };

    return this.request<SendMessageResponse>("/api/sendLocation", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Send contact card(s)
   * POST /api/sendContactVcard
   */
  async sendContact(params: {
    chatId: string;
    contacts: Array<{ vcard: string }>;
    reply_to?: string;
  }): Promise<SendMessageResponse> {
    const { chatId, contacts, reply_to } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (!contacts || contacts.length === 0) {
      throw new WAHAError("contacts array is required");
    }

    const body = {
      chatId,
      contacts,
      session: this.session,
      reply_to,
    };

    return this.request<SendMessageResponse>("/api/sendContactVcard", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * React to a message
   * PUT /api/reaction
   */
  async reactToMessage(params: {
    messageId: string;
    reaction: string;
  }): Promise<void> {
    const { messageId, reaction } = params;

    if (!messageId) {
      throw new WAHAError("messageId is required");
    }

    if (!reaction) {
      throw new WAHAError("reaction is required");
    }

    const body = {
      messageId,
      reaction,
      session: this.session,
    };

    await this.request<void>("/api/reaction", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * Star or unstar a message
   * PUT /api/:session/chats/:chatId/messages/:messageId/star
   */
  async starMessage(params: {
    chatId: string;
    messageId: string;
    star: boolean;
  }): Promise<void> {
    const { chatId, messageId, star } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (!messageId) {
      throw new WAHAError("messageId is required");
    }

    const endpoint = `/api/${this.session}/chats/${encodeURIComponent(
      chatId
    )}/messages/${encodeURIComponent(messageId)}/star`;

    const body = {
      star,
    };

    await this.request<void>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get list of groups
   * GET /api/:session/groups
   */
  async getGroups(params?: {
    sortBy?: "id" | "name";
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
    exclude?: string[];
  }): Promise<any[]> {
    const queryParams: Record<string, any> = {};

    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.limit) queryParams.limit = Math.min(params.limit, 100);
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.exclude) queryParams.exclude = params.exclude;

    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/${this.session}/groups${queryString}`;

    return this.request<any[]>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Get group information
   * GET /api/:session/groups/:id
   */
  async getGroupInfo(groupId: string): Promise<any> {
    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}`;

    return this.request<any>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Get group picture
   * GET /api/:session/groups/:id/picture
   */
  async getGroupPicture(params: {
    groupId: string;
    refresh?: boolean;
  }): Promise<{ url: string }> {
    const { groupId, refresh } = params;

    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    const queryParams: Record<string, any> = {};
    if (refresh !== undefined) {
      queryParams.refresh = refresh;
    }

    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(
      groupId
    )}/picture${queryString}`;

    return this.request<{ url: string }>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Set group picture
   * POST /api/:session/groups/:id/picture
   */
  async setGroupPicture(params: {
    groupId: string;
    file: {
      url?: string;
      data?: string;
    };
  }): Promise<void> {
    const { groupId, file } = params;

    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    if (!file || (!file.url && !file.data)) {
      throw new WAHAError("file with url or data is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/picture`;

    const body = { file };

    await this.request<void>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Delete group picture
   * DELETE /api/:session/groups/:id/picture
   */
  async deleteGroupPicture(groupId: string): Promise<void> {
    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/picture`;

    await this.request<void>(endpoint, {
      method: "DELETE",
    });
  }

  /**
   * Create a new group
   * POST /api/:session/groups
   */
  async createGroup(params: {
    name: string;
    participants: Array<{ id: string }>;
  }): Promise<any> {
    const { name, participants } = params;

    if (!name) {
      throw new WAHAError("name is required");
    }

    if (!participants || participants.length === 0) {
      throw new WAHAError("participants array is required");
    }

    const body = { name, participants };

    return this.request<any>(`/api/${this.session}/groups`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Update group subject/name
   * PUT /api/:session/groups/:id/subject
   */
  async updateGroupSubject(params: {
    groupId: string;
    subject: string;
  }): Promise<void> {
    const { groupId, subject } = params;

    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    if (!subject) {
      throw new WAHAError("subject is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/subject`;

    const body = { subject };

    await this.request<void>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * Update group description
   * PUT /api/:session/groups/:id/description
   */
  async updateGroupDescription(params: {
    groupId: string;
    description: string;
  }): Promise<void> {
    const { groupId, description } = params;

    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    if (!description) {
      throw new WAHAError("description is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/description`;

    const body = { description };

    await this.request<void>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * Leave a group
   * POST /api/:session/groups/:id/leave
   */
  async leaveGroup(groupId: string): Promise<void> {
    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/leave`;

    await this.request<void>(endpoint, {
      method: "POST",
    });
  }

  /**
   * Get group participants
   * GET /api/:session/groups/:id/participants
   */
  async getGroupParticipants(groupId: string): Promise<any[]> {
    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/participants`;

    return this.request<any[]>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Add participants to group
   * POST /api/:session/groups/:id/participants/add
   */
  async addGroupParticipants(params: {
    groupId: string;
    participants: Array<{ id: string }>;
  }): Promise<any> {
    const { groupId, participants } = params;

    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    if (!participants || participants.length === 0) {
      throw new WAHAError("participants array is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/participants/add`;

    const body = { participants };

    return this.request<any>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Remove participants from group
   * POST /api/:session/groups/:id/participants/remove
   */
  async removeGroupParticipants(params: {
    groupId: string;
    participants: Array<{ id: string }>;
  }): Promise<any> {
    const { groupId, participants } = params;

    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    if (!participants || participants.length === 0) {
      throw new WAHAError("participants array is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/participants/remove`;

    const body = { participants };

    return this.request<any>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Promote participants to admin
   * POST /api/:session/groups/:id/admin/promote
   */
  async promoteGroupAdmin(params: {
    groupId: string;
    participants: Array<{ id: string }>;
  }): Promise<any> {
    const { groupId, participants } = params;

    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    if (!participants || participants.length === 0) {
      throw new WAHAError("participants array is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/admin/promote`;

    const body = { participants };

    return this.request<any>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Demote admin
   * POST /api/:session/groups/:id/admin/demote
   */
  async demoteGroupAdmin(params: {
    groupId: string;
    participants: Array<{ id: string }>;
  }): Promise<any> {
    const { groupId, participants } = params;

    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    if (!participants || participants.length === 0) {
      throw new WAHAError("participants array is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/admin/demote`;

    const body = { participants };

    return this.request<any>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get group invite code
   * GET /api/:session/groups/:id/invite-code
   */
  async getGroupInviteCode(groupId: string): Promise<{ inviteCode: string }> {
    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/invite-code`;

    return this.request<{ inviteCode: string }>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Revoke group invite code
   * POST /api/:session/groups/:id/invite-code/revoke
   */
  async revokeGroupInviteCode(groupId: string): Promise<{ inviteCode: string }> {
    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/invite-code/revoke`;

    return this.request<{ inviteCode: string }>(endpoint, {
      method: "POST",
    });
  }

  /**
   * Join group via invite code
   * POST /api/:session/groups/join
   */
  async joinGroup(code: string): Promise<any> {
    if (!code) {
      throw new WAHAError("code is required");
    }

    const body = { code };

    return this.request<any>(`/api/${this.session}/groups/join`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get group join info
   * GET /api/:session/groups/join-info
   */
  async getGroupJoinInfo(code: string): Promise<any> {
    if (!code) {
      throw new WAHAError("code is required");
    }

    const queryParams = { code };
    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/${this.session}/groups/join-info${queryString}`;

    return this.request<any>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Set group messages admin only
   * PUT /api/:session/groups/:id/settings/security/messages-admin-only
   */
  async setGroupMessagesAdminOnly(params: {
    groupId: string;
    adminsOnly: boolean;
  }): Promise<void> {
    const { groupId, adminsOnly } = params;

    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    if (adminsOnly === undefined) {
      throw new WAHAError("adminsOnly is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/settings/security/messages-admin-only`;

    const body = { adminsOnly };

    await this.request<void>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * Set group info admin only
   * PUT /api/:session/groups/:id/settings/security/info-admin-only
   */
  async setGroupInfoAdminOnly(params: {
    groupId: string;
    adminsOnly: boolean;
  }): Promise<void> {
    const { groupId, adminsOnly } = params;

    if (!groupId) {
      throw new WAHAError("groupId is required");
    }

    if (adminsOnly === undefined) {
      throw new WAHAError("adminsOnly is required");
    }

    const endpoint = `/api/${this.session}/groups/${encodeURIComponent(groupId)}/settings/security/info-admin-only`;

    const body = { adminsOnly };

    await this.request<void>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get groups count
   * GET /api/:session/groups/count
   */
  async getGroupsCount(): Promise<{ count: number }> {
    const endpoint = `/api/${this.session}/groups/count`;

    return this.request<{ count: number }>(endpoint, {
      method: "GET",
    });
  }

  // ==================== CONTACT MANAGEMENT ====================

  /**
   * Get contact information by ID
   * GET /api/contacts?contactId=...&session=...
   */
  async getContact(contactId: string): Promise<any> {
    if (!contactId) {
      throw new WAHAError("contactId is required");
    }

    const queryParams = { 
      contactId,
      session: this.session
    };
    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/contacts${queryString}`;

    return this.request<any>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Get all contacts with pagination
   * GET /api/contacts/all?session=...
   */
  async getAllContacts(params?: {
    sortBy?: "id" | "name";
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const queryParams: Record<string, any> = {
      session: this.session
    };

    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.limit) queryParams.limit = Math.min(params.limit, 100);
    if (params?.offset) queryParams.offset = params.offset;

    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/contacts/all${queryString}`;

    return this.request<any[]>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Check if phone number is registered on WhatsApp
   * GET /api/contacts/check-exists?phone=...&session=...
   */
  async checkContactExists(phone: string): Promise<any> {
    if (!phone) {
      throw new WAHAError("phone is required");
    }

    const queryParams = { 
      phone,
      session: this.session
    };
    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/contacts/check-exists${queryString}`;

    return this.request<any>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Get contact's about/status text
   * GET /api/contacts/about?contactId=...&session=...
   */
  async getContactAbout(contactId: string): Promise<any> {
    if (!contactId) {
      throw new WAHAError("contactId is required");
    }

    const queryParams = { 
      contactId,
      session: this.session
    };
    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/contacts/about${queryString}`;

    return this.request<any>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Get contact's profile picture URL
   * GET /api/contacts/profile-picture?contactId=...&session=...
   */
  async getContactProfilePicture(params: {
    contactId: string;
    refresh?: boolean;
  }): Promise<{ url: string }> {
    const { contactId, refresh } = params;

    if (!contactId) {
      throw new WAHAError("contactId is required");
    }

    const queryParams: Record<string, any> = { 
      contactId,
      session: this.session
    };
    if (refresh !== undefined) {
      queryParams.refresh = refresh;
    }

    const queryString = this.buildQueryString(queryParams);
    const endpoint = `/api/contacts/profile-picture${queryString}`;

    const response = await this.request<{ profilePictureURL?: string; url?: string }>(endpoint, {
      method: "GET",
    });

    // Handle both response formats: profilePictureURL (contacts) or url (chats)
    return { url: response.profilePictureURL || response.url || '' };
  }

  /**
   * Block a contact
   * POST /api/contacts/block
   */
  async blockContact(contactId: string): Promise<void> {
    if (!contactId) {
      throw new WAHAError("contactId is required");
    }

    const body = {
      contactId,
      session: this.session,
    };

    await this.request<void>("/api/contacts/block", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Unblock a contact
   * POST /api/contacts/unblock
   */
  async unblockContact(contactId: string): Promise<void> {
    if (!contactId) {
      throw new WAHAError("contactId is required");
    }

    const body = {
      contactId,
      session: this.session,
    };

    await this.request<void>("/api/contacts/unblock", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // ==================== PRESENCE/STATUS MANAGEMENT ====================

  /**
   * Get presence information for a chat
   * GET /api/:session/presence/:chatId
   */
  async getPresence(chatId: string): Promise<any> {
    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    const endpoint = `/api/${this.session}/presence/${encodeURIComponent(chatId)}`;

    return this.request<any>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Subscribe to presence updates for a chat
   * POST /api/:session/presence/:chatId/subscribe
   */
  async subscribePresence(chatId: string): Promise<void> {
    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    const endpoint = `/api/${this.session}/presence/${encodeURIComponent(chatId)}/subscribe`;

    await this.request<void>(endpoint, {
      method: "POST",
    });
  }

  /**
   * Set your own presence status
   * POST /api/:session/presence
   */
  async setPresence(params: {
    chatId: string;
    presence: "online" | "offline" | "typing" | "recording" | "paused";
  }): Promise<void> {
    const { chatId, presence } = params;

    if (!chatId) {
      throw new WAHAError("chatId is required");
    }

    if (!presence) {
      throw new WAHAError("presence is required");
    }

    const body = {
      chatId,
      presence,
    };

    await this.request<void>(`/api/${this.session}/presence`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Get all subscribed presence information
   * GET /api/:session/presence
   */
  async getAllPresence(): Promise<any[]> {
    const endpoint = `/api/${this.session}/presence`;

    return this.request<any[]>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Validate chat ID format
   */
  static validateChatId(chatId: string): boolean {
    // Chat ID should be in format: number@c.us (individual) or number@g.us (group)
    return /^\d+@(c|g)\.us$/.test(chatId);
  }
}
