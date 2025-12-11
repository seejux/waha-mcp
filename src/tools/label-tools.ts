/**
 * Label Tool Definitions
 * Tools for managing WhatsApp Business labels on chats and messages
 */

export const labelTools = [
  {
    name: "waha_get_labels",
    description:
      "Get all available labels from WhatsApp Business. Labels are used to organize and categorize chats and messages. Only available for WhatsApp Business accounts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },},
    },
  },
  {
    name: "waha_get_chat_labels",
    description:
      "Get all labels assigned to a specific chat. Returns an array of label objects with their IDs, names, and colors.",
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
          description: "Chat ID (format: number@c.us)",
        },
      },
      required: ["chatId"],
    },
  },
  {
    name: "waha_put_chat_labels",
    description:
      "Assign one or more labels to a chat. This replaces all existing labels on the chat. Labels help organize and categorize conversations.",
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
          description: "Chat ID (format: number@c.us)",
        },
        labels: {
          type: "array" as const,
          items: {
            type: ["string", "object"] as any,
            description: "Label ID string or object with 'id' property",
          },
          description: "Array of label IDs or label objects to assign",
        },
      },
      required: ["chatId", "labels"],
    },
  },
  {
    name: "waha_delete_chat_label",
    description:
      "Remove a specific label from a chat. The chat will no longer be associated with this label.",
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
          description: "Chat ID (format: number@c.us)",
        },
        labelId: {
          type: "string" as const,
          description: "Label ID to remove",
        },
      },
      required: ["chatId", "labelId"],
    },
  },
  {
    name: "waha_get_message_labels",
    description:
      "Get all labels assigned to a specific message. Returns an array of label objects.",
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
          description: "Chat ID (format: number@c.us)",
        },
        messageId: {
          type: "string" as const,
          description: "Message ID",
        },
      },
      required: ["chatId", "messageId"],
    },
  },
  {
    name: "waha_put_message_labels",
    description:
      "Assign one or more labels to a specific message. This replaces all existing labels on the message.",
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
          description: "Chat ID (format: number@c.us)",
        },
        messageId: {
          type: "string" as const,
          description: "Message ID",
        },
        labels: {
          type: "array" as const,
          items: {
            type: ["string", "object"] as any,
            description: "Label ID string or object with 'id' property",
          },
          description: "Array of label IDs or label objects to assign",
        },
      },
      required: ["chatId", "messageId", "labels"],
    },
  },
  {
    name: "waha_delete_message_label",
    description:
      "Remove a specific label from a message. The message will no longer be associated with this label.",
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
          description: "Chat ID (format: number@c.us)",
        },
        messageId: {
          type: "string" as const,
          description: "Message ID",
        },
        labelId: {
          type: "string" as const,
          description: "Label ID to remove",
        },
      },
      required: ["chatId", "messageId", "labelId"],
    },
  },
];
