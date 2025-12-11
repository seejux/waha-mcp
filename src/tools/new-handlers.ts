/**
 * Tool Handlers for New WAHA Features
 * Session Management, Polls, Status, Labels
 */

import type { WAHAClient } from "../client/index.js";
import {
  formatSession,
  formatSessions,
  formatPollSuccess,
  formatStatuses,
  formatLabels,
  formatSuccess,
} from "./formatters.js";

/**
 * Session Management Handlers
 */
export async function handleListSessions(wahaClient: WAHAClient, args: any) {
  const all = args.all || false;
  const sessions = await wahaClient.listSessions({ all });
  const formattedResponse = formatSessions(sessions);

  return {
    content: [
      {
        type: "text",
        text: formattedResponse,
      },
    ],
  };
}

export async function handleGetSession(wahaClient: WAHAClient, args: any) {
  const expand = args.expand;
  const session = await wahaClient.getSession({ expand });
  const formattedResponse = formatSession(session);

  return {
    content: [
      {
        type: "text",
        text: formattedResponse,
      },
    ],
  };
}

export async function handleCreateSession(wahaClient: WAHAClient, args: any) {
  const { name, start, config } = args;
  const session = await wahaClient.createSession({ name, start, config });
  const formattedResponse = formatSession(session);

  return {
    content: [
      {
        type: "text",
        text: `Session created successfully!\n\n${formattedResponse}`,
      },
    ],
  };
}

export async function handleStartSession(wahaClient: WAHAClient) {
  const session = await wahaClient.startSession();
  const formattedResponse = formatSession(session);

  return {
    content: [
      {
        type: "text",
        text: `Session started!\n\n${formattedResponse}`,
      },
    ],
  };
}

export async function handleStopSession(wahaClient: WAHAClient) {
  const session = await wahaClient.stopSession();
  const formattedResponse = formatSession(session);

  return {
    content: [
      {
        type: "text",
        text: `Session stopped!\n\n${formattedResponse}`,
      },
    ],
  };
}

export async function handleRestartSession(wahaClient: WAHAClient) {
  const session = await wahaClient.restartSession();
  const formattedResponse = formatSession(session);

  return {
    content: [
      {
        type: "text",
        text: `Session restarted!\n\n${formattedResponse}`,
      },
    ],
  };
}

export async function handleLogoutSession(wahaClient: WAHAClient) {
  await wahaClient.logoutSession();

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Logout", "The session has been logged out successfully. Authentication data has been removed."),
      },
    ],
  };
}

export async function handleDeleteSession(wahaClient: WAHAClient) {
  await wahaClient.deleteSession();

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Delete session", "The session has been permanently deleted. Both authentication data and configuration have been removed."),
      },
    ],
  };
}

export async function handleGetSessionMe(wahaClient: WAHAClient) {
  const me = await wahaClient.getSessionMe();

  if (!me) {
    return {
      content: [
        {
          type: "text",
          text: "Session is not authenticated. Please scan QR code or use pairing code to authenticate.",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Authenticated Account:\nID: ${me.id}\nName: ${me.pushName || 'Unknown'}`,
      },
    ],
  };
}

export async function handleGetQRCode(wahaClient: WAHAClient, args: any) {
  const format = args.format || "base64";
  const qr = await wahaClient.getQRCode({ format });

  if (format === "raw") {
    return {
      content: [
        {
          type: "text",
          text: `QR Code (raw):\n${qr}`,
        },
      ],
    };
  } else if (format === "base64") {
    return {
      content: [
        {
          type: "text",
          text: `QR Code (base64):\n${JSON.stringify(qr, null, 2)}`,
        },
      ],
    };
  } else {
    return {
      content: [
        {
          type: "text",
          text: "QR Code retrieved (binary image format). Check your WAHA server logs for the image.",
        },
      ],
    };
  }
}

export async function handleRequestPairingCode(wahaClient: WAHAClient, args: any) {
  const { phoneNumber } = args;

  if (!phoneNumber) {
    throw new Error("phoneNumber is required");
  }

  const result = await wahaClient.requestPairingCode({ phoneNumber });

  return {
    content: [
      {
        type: "text",
        text: `Pairing Code: ${result.code}\n\nEnter this code in your WhatsApp mobile app to authenticate.`,
      },
    ],
  };
}

export async function handleGetScreenshot(wahaClient: WAHAClient, args: any) {
  const format = args.format || "base64";
  const screenshot = await wahaClient.getScreenshot({ format });

  if (format === "base64") {
    return {
      content: [
        {
          type: "text",
          text: `Screenshot (base64):\n${JSON.stringify(screenshot, null, 2)}`,
        },
      ],
    };
  } else {
    return {
      content: [
        {
          type: "text",
          text: "Screenshot retrieved (binary image format). Check your WAHA server logs for the image.",
        },
      ],
    };
  }
}

/**
 * Poll Handlers
 */
export async function handleSendPoll(wahaClient: WAHAClient, args: any) {
  const { chatId, poll, replyTo } = args;

  if (!chatId) {
    throw new Error("chatId is required");
  }

  if (!poll || !poll.name || !poll.options || poll.options.length === 0) {
    throw new Error("poll with name and options is required");
  }

  const response = await wahaClient.sendPoll({
    chatId,
    poll,
    reply_to: replyTo,
  });

  const formattedResponse = formatPollSuccess(chatId, response.id);

  return {
    content: [
      {
        type: "text",
        text: formattedResponse,
      },
    ],
  };
}

export async function handleSendPollVote(wahaClient: WAHAClient, args: any) {
  const { chatId, pollMessageId, pollServerId, votes } = args;

  if (!chatId) {
    throw new Error("chatId is required");
  }

  if (!pollMessageId) {
    throw new Error("pollMessageId is required");
  }

  if (!votes || votes.length === 0) {
    throw new Error("votes array is required");
  }

  await wahaClient.sendPollVote({
    chatId,
    pollMessageId,
    pollServerId,
    votes,
  });

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Vote cast", `Your vote has been submitted for poll ${pollMessageId}`),
      },
    ],
  };
}

/**
 * Status/Stories Handlers
 */
export async function handleSendTextStatus(wahaClient: WAHAClient, args: any) {
  const { text, backgroundColor, font } = args;

  if (!text) {
    throw new Error("text is required");
  }

  const response = await wahaClient.sendTextStatus({
    text,
    backgroundColor,
    font,
  });

  return {
    content: [
      {
        type: "text",
        text: `Text status sent successfully!\nStatus ID: ${response.id}\n\nYour status will be visible to your contacts for 24 hours.`,
      },
    ],
  };
}

export async function handleSendMediaStatus(wahaClient: WAHAClient, args: any) {
  const { file, mediaType, caption } = args;

  if (!file || (!file.url && !file.data)) {
    throw new Error("file with url or data is required");
  }

  if (!mediaType) {
    throw new Error("mediaType is required");
  }

  const response = await wahaClient.sendMediaStatus({
    file,
    mediaType,
    caption,
  });

  return {
    content: [
      {
        type: "text",
        text: `${mediaType === 'image' ? 'Image' : 'Video'} status sent successfully!\nStatus ID: ${response.id}\n\nYour status will be visible to your contacts for 24 hours.`,
      },
    ],
  };
}

export async function handleGetStatuses(wahaClient: WAHAClient) {
  const statuses = await wahaClient.getStatuses();
  const formattedResponse = formatStatuses(statuses);

  return {
    content: [
      {
        type: "text",
        text: formattedResponse,
      },
    ],
  };
}

export async function handleDeleteStatus(wahaClient: WAHAClient, args: any) {
  const { messageId } = args;

  if (!messageId) {
    throw new Error("messageId is required");
  }

  await wahaClient.deleteStatus(messageId);

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Status deleted", `Status ${messageId} has been removed.`),
      },
    ],
  };
}

/**
 * Label Handlers
 */
export async function handleGetLabels(wahaClient: WAHAClient) {
  const labels = await wahaClient.getLabels();
  const formattedResponse = formatLabels(labels);

  return {
    content: [
      {
        type: "text",
        text: formattedResponse,
      },
    ],
  };
}

export async function handleGetChatLabels(wahaClient: WAHAClient, args: any) {
  const { chatId } = args;

  if (!chatId) {
    throw new Error("chatId is required");
  }

  const labels = await wahaClient.getChatLabels(chatId);
  const formattedResponse = formatLabels(labels);

  return {
    content: [
      {
        type: "text",
        text: `Labels for chat ${chatId}:\n\n${formattedResponse}`,
      },
    ],
  };
}

export async function handlePutChatLabels(wahaClient: WAHAClient, args: any) {
  const { chatId, labels } = args;

  if (!chatId) {
    throw new Error("chatId is required");
  }

  if (!labels || labels.length === 0) {
    throw new Error("labels array is required");
  }

  await wahaClient.putChatLabels({ chatId, labels });

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Labels assigned", `${labels.length} label(s) have been assigned to chat ${chatId}`),
      },
    ],
  };
}

export async function handleDeleteChatLabel(wahaClient: WAHAClient, args: any) {
  const { chatId, labelId } = args;

  if (!chatId) {
    throw new Error("chatId is required");
  }

  if (!labelId) {
    throw new Error("labelId is required");
  }

  await wahaClient.deleteChatLabel(chatId, labelId);

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Label removed", `Label ${labelId} has been removed from chat ${chatId}`),
      },
    ],
  };
}

export async function handleGetMessageLabels(wahaClient: WAHAClient, args: any) {
  const { chatId, messageId } = args;

  if (!chatId) {
    throw new Error("chatId is required");
  }

  if (!messageId) {
    throw new Error("messageId is required");
  }

  const labels = await wahaClient.getMessageLabels(chatId, messageId);
  const formattedResponse = formatLabels(labels);

  return {
    content: [
      {
        type: "text",
        text: `Labels for message ${messageId} in chat ${chatId}:\n\n${formattedResponse}`,
      },
    ],
  };
}

export async function handlePutMessageLabels(wahaClient: WAHAClient, args: any) {
  const { chatId, messageId, labels } = args;

  if (!chatId) {
    throw new Error("chatId is required");
  }

  if (!messageId) {
    throw new Error("messageId is required");
  }

  if (!labels || labels.length === 0) {
    throw new Error("labels array is required");
  }

  await wahaClient.putMessageLabels({ chatId, messageId, labels });

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Labels assigned", `${labels.length} label(s) have been assigned to message ${messageId}`),
      },
    ],
  };
}

export async function handleDeleteMessageLabel(wahaClient: WAHAClient, args: any) {
  const { chatId, messageId, labelId } = args;

  if (!chatId) {
    throw new Error("chatId is required");
  }

  if (!messageId) {
    throw new Error("messageId is required");
  }

  if (!labelId) {
    throw new Error("labelId is required");
  }

  await wahaClient.deleteMessageLabel(chatId, messageId, labelId);

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Label removed", `Label ${labelId} has been removed from message ${messageId}`),
      },
    ],
  };
}

/**
 * Profile Management Handlers
 */
export async function handleSetMyProfileName(wahaClient: WAHAClient, args: any) {
  const { name } = args;

  if (!name) {
    throw new Error("name is required");
  }

  await wahaClient.setMyProfileName(name);

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Profile name updated", `Your profile name has been set to: ${name}`),
      },
    ],
  };
}

export async function handleSetMyProfileStatus(wahaClient: WAHAClient, args: any) {
  const { status } = args;

  if (!status) {
    throw new Error("status is required");
  }

  await wahaClient.setMyProfileStatus(status);

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Profile status updated", `Your profile status (About) has been set to: ${status}`),
      },
    ],
  };
}

export async function handleSetMyProfilePicture(wahaClient: WAHAClient, args: any) {
  const { file } = args;

  if (!file || (!file.url && !file.data)) {
    throw new Error("file with url or data is required");
  }

  await wahaClient.setMyProfilePicture(file);

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Profile picture updated", "Your profile picture has been successfully updated."),
      },
    ],
  };
}

export async function handleDeleteMyProfilePicture(wahaClient: WAHAClient) {
  await wahaClient.deleteMyProfilePicture();

  return {
    content: [
      {
        type: "text",
        text: formatSuccess("Profile picture deleted", "Your profile picture has been removed. Your profile now shows the default picture."),
      },
    ],
  };
}
