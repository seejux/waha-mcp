/**
 * Profile Management Tool Definitions
 * Tools for managing WhatsApp user profile (name, status, picture)
 */

export const profileTools = [
  {
    name: "waha_set_my_profile_name",
    description:
      "Set your WhatsApp profile name (display name). This is the name that appears to your contacts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string" as const,
          description: "Your new profile name (display name)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "waha_set_my_profile_status",
    description:
      "Set your WhatsApp profile status (About text). This is the status message that appears below your name in your profile.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string" as const,
          description: "Your new profile status (About text)",
        },
      },
      required: ["status"],
    },
  },
  {
    name: "waha_set_my_profile_picture",
    description:
      "Set your WhatsApp profile picture. You can provide either a URL to an image or base64 encoded image data.",
    inputSchema: {
      type: "object" as const,
      properties: {
        file: {
          type: "object" as const,
          description: "Profile picture file",
          properties: {
            url: {
              type: "string" as const,
              description: "URL to the image file",
            },
            data: {
              type: "string" as const,
              description: "Base64 encoded image data",
            },
            mimetype: {
              type: "string" as const,
              description: "MIME type of the image (e.g., 'image/jpeg', 'image/png')",
            },
          },
        },
      },
      required: ["file"],
    },
  },
  {
    name: "waha_delete_my_profile_picture",
    description:
      "Delete your WhatsApp profile picture. This will remove your current profile picture and reset it to the default.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];
