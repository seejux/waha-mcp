/**
 * Status/Stories Tool Definitions
 * Tools for managing WhatsApp statuses (stories)
 */

export const statusTools = [
  {
    name: "waha_send_text_status",
    description:
      "Send a text status (story) to WhatsApp. Text statuses can have custom background colors and fonts. Statuses disappear after 24 hours.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        text: {
          type: "string" as const,
          description: "Text content for the status",
        },
        backgroundColor: {
          type: "string" as const,
          description:
            "Optional: Background color (hex format, e.g., '#FF5733')",
        },
        font: {
          type: "number" as const,
          description: "Optional: Font style number (0-5)",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "waha_send_media_status",
    description:
      "Send an image or video status (story) to WhatsApp. Media statuses can include captions. Statuses disappear after 24 hours.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        file: {
          type: "object" as const,
          description: "Media file to send",
          properties: {
            url: {
              type: "string" as const,
              description: "URL to the media file",
            },
            data: {
              type: "string" as const,
              description: "Base64 encoded media data",
            },
            mimetype: {
              type: "string" as const,
              description:
                "MIME type (e.g., 'image/jpeg', 'image/png', 'video/mp4')",
            },
            filename: {
              type: "string" as const,
              description: "Optional: filename",
            },
          },
          required: ["mimetype"],
        },
        mediaType: {
          type: "string" as const,
          description: "Type of media: 'image' or 'video'",
          enum: ["image", "video"],
        },
        caption: {
          type: "string" as const,
          description: "Optional: caption for the media status",
        },
      },
      required: ["file", "mediaType"],
    },
  },
  {
    name: "waha_get_statuses",
    description:
      "Get all available statuses (stories) from your contacts. Returns statuses that are currently visible (within 24 hours).",
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
    name: "waha_delete_status",
    description:
      "Delete your own status (story). You can only delete statuses that you have sent.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        messageId: {
          type: "string" as const,
          description: "Message ID of the status to delete",
        },
      },
      required: ["messageId"],
    },
  },
];
