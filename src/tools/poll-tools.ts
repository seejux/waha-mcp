/**
 * Poll Tool Definitions
 * Tools for sending and voting on WhatsApp polls
 */

export const pollTools = [
  {
    name: "waha_send_poll",
    description:
      "Send a poll to a WhatsApp chat. Polls allow users to choose one or multiple options from a list. Save the returned message ID to track votes later via webhook events.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        chatId: {
          type: "string" as const,
          description:
            "Chat ID to send poll to (format: number@c.us for individual, number@g.us for group)",
        },
        poll: {
          type: "object" as const,
          description: "Poll configuration",
          properties: {
            name: {
              type: "string" as const,
              description: "Poll question/title",
            },
            options: {
              type: "array" as const,
              items: { type: "string" as const },
              description: "Array of poll options (answers)",
            },
            multipleAnswers: {
              type: "boolean" as const,
              description:
                "Allow users to select multiple options (default: false)",
              default: false,
            },
          },
          required: ["name", "options"],
        },
        replyTo: {
          type: "string" as const,
          description: "Optional: Message ID to reply to",
        },
      },
      required: ["chatId", "poll"],
    },
  },
  {
    name: "waha_send_poll_vote",
    description:
      "Cast a vote for an existing poll. Specify the poll message ID and the option(s) you're voting for. For channels, you may need to provide pollServerId.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        chatId: {
          type: "string" as const,
          description:
            "Chat ID where the poll was sent (format: number@c.us or number@g.us)",
        },
        pollMessageId: {
          type: "string" as const,
          description:
            "Poll message ID (format: {fromMe}_{chatID}_{messageId}[_{participant}] or just {ID} for GOWS engine)",
        },
        pollServerId: {
          type: "number" as const,
          description:
            "Server message ID (for channels only, optional - may be auto-detected from storage)",
        },
        votes: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Array of poll options you're voting for (e.g., ['Option 1'])",
        },
      },
      required: ["chatId", "pollMessageId", "votes"],
    },
  },
];
