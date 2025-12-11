/**
 * Session Management Tool Definitions
 * Tools for managing WAHA WhatsApp sessions
 */

export const sessionTools = [
  {
    name: "waha_list_sessions",
    description:
      "List all WhatsApp sessions. Returns information about all sessions including their status, configuration, and connected account details. Use 'all=true' to include stopped sessions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        all: {
          type: "boolean" as const,
          description:
            "Include all sessions, even stopped ones (default: false shows only running sessions)",
          default: false,
        },
      },
    },
  },
  {
    name: "waha_get_session",
    description:
      "Get detailed information about a specific WhatsApp session. Returns session status, configuration, connected account info, and optionally associated apps.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        expand: {
          type: "array" as const,
          items: { type: "string" as const },
          description:
            "Optional: expand related data (e.g., ['apps'] to include associated apps)",
        },
      },
    },
  },
  {
    name: "waha_create_session",
    description:
      "Create a new WhatsApp session. You can configure webhooks, proxy, metadata, and other settings. The session will start automatically unless start=false is specified.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        name: {
          type: "string" as const,
          description:
            "Session name/ID (if not provided, will be auto-generated)",
        },
        start: {
          type: "boolean" as const,
          description:
            "Start the session immediately after creation (default: true)",
          default: true,
        },
        config: {
          type: "object" as const,
          description:
            "Session configuration (webhooks, proxy, metadata, debug, etc.)",
          properties: {
            webhooks: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  url: { type: "string" as const },
                  events: {
                    type: "array" as const,
                    items: { type: "string" as const },
                  },
                  hmac: {
                    type: "object" as const,
                    properties: {
                      key: { type: "string" as const },
                    },
                  },
                },
              },
            },
            metadata: {
              type: "object" as const,
              description: "Custom metadata as key-value pairs",
            },
            proxy: {
              type: "object" as const,
              properties: {
                server: { type: "string" as const },
                username: { type: "string" as const },
                password: { type: "string" as const },
              },
            },
            debug: {
              type: "boolean" as const,
              description: "Enable debug logging for this session",
            },
          },
        },
      },
    },
  },
  {
    name: "waha_start_session",
    description:
      "Start a stopped WhatsApp session. The session will enter STARTING status and then require authentication via QR code or pairing code if not authenticated yet.",
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
    name: "waha_stop_session",
    description:
      "Stop a running WhatsApp session. This does not logout or delete the session, just stops it temporarily. Session data and configuration are preserved.",
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
    name: "waha_restart_session",
    description:
      "Restart a WhatsApp session. This will stop and then start the session again. Useful for applying configuration changes or recovering from errors.",
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
    name: "waha_logout_session",
    description:
      "Logout from a WhatsApp session. This removes authentication data and disconnects the device, but keeps the session configuration. You'll need to scan QR code again after logout.",
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
    name: "waha_delete_session",
    description:
      "Delete a WhatsApp session completely. This removes both authentication data and session configuration. WARNING: This is a destructive operation that cannot be undone.",
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
    name: "waha_get_session_me",
    description:
      "Get information about the authenticated WhatsApp account for this session. Returns phone number and push name. Returns null if not authenticated.",
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
    name: "waha_get_qr_code",
    description:
      "Get QR code for authenticating a new WhatsApp session. The QR code can be returned as an image, base64 string, or raw text. Scan this with WhatsApp mobile app to authenticate.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        format: {
          type: "string" as const,
          description:
            "QR code format: 'image' (binary PNG), 'base64' (base64 encoded), or 'raw' (plain text)",
          enum: ["image", "base64", "raw"],
          default: "base64",
        },
      },
    },
  },
  {
    name: "waha_request_pairing_code",
    description:
      "Request a pairing code for authenticating a WhatsApp session using phone number instead of QR code. Enter the received code in WhatsApp mobile app.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        phoneNumber: {
          type: "string" as const,
          description: "Phone number with country code (e.g., '1234567890')",
        },
      },
      required: ["phoneNumber"],
    },
  },
  {
    name: "waha_get_screenshot",
    description:
      "Get a screenshot of the WhatsApp session screen. Useful for debugging. Available formats: binary image or base64 encoded. Only works with WEBJS engine.",
    inputSchema: {
      type: "object" as const,
      properties: {
        session: {
          type: "string" as const,
          description:
            "WhatsApp session name (optional, defaults to configured WAHA_SESSION if not provided)",
        },
        format: {
          type: "string" as const,
          description: "Screenshot format: 'image' (binary) or 'base64'",
          enum: ["image", "base64"],
          default: "base64",
        },
      },
    },
  },
];
