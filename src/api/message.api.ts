import { api, apiClient } from "./axios";
import {
  Message,
  MessageReaction,
  MessageSearchResult,
  // PinnedMessage,
} from "./types/message.types";
import { ApiResponse } from "./types/common.types";
import { getUser } from "./profile.api";

type ReactionTarget = { message_id?: string; dm_message_id?: string };
type PinContext = { channel_id?: string; thread_id?: string };

const normalizeArray = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["data", "messages", "results", "pins", "reactions"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
};

const DM_CACHE_TTL_MS = 2 * 60 * 1000;

type CachedDmResponse = {
  data: any;
  success: boolean;
};

type CachedDmEntry = {
  fetchedAt: number;
  response: CachedDmResponse;
};

const userDmCache = new Map<string, CachedDmEntry>();
const userDmInFlight = new Map<string, Promise<CachedDmResponse>>();

export const invalidateUserDmCache = (userId?: string) => {
  if (userId) {
    userDmCache.delete(userId);
    userDmInFlight.delete(userId);
    return;
  }

  userDmCache.clear();
  userDmInFlight.clear();
};

//Uploads messages in the channel
export const uploadMessage = async (payload: {
  file?: File;
  content?: string;
  sender_id?: string;
  channel_id: string;
  reply_to?: string | number;
}): Promise<Message> => {
  try {
    const formData = new FormData();

    if (payload.sender_id) {
      formData.append("sender_id", payload.sender_id);
    }

    formData.append("channel_id", payload.channel_id);

    if (payload.content?.trim()) {
      formData.append("content", payload.content);
    }

    if (payload.reply_to !== undefined && payload.reply_to !== null) {
      formData.append("reply_to", String(payload.reply_to));
    }

    if (payload.file) {
      formData.append("file", payload.file);
    }

    const response = await apiClient.post("/api/message/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error uploading message:", error);
    throw error;
  }
};

//Used to upload messages in DM of the user
export const uploaddm = async (payload: {
  mediaurl?: File;
  message?: string;
  sender_id?: string;
  receiver_id: string;
  reply_to?: string | number;
}) => {
  try {
    const formData = new FormData();

    formData.append("receiver_id", payload.receiver_id);

    if (payload.sender_id) {
      formData.append("sender_id", payload.sender_id);
    }

    if (payload.message?.trim()) {
      formData.append("content", payload.message);
    }

    if (payload.reply_to !== undefined && payload.reply_to !== null) {
      formData.append("reply_to", String(payload.reply_to));
    }

    if (payload.mediaurl) {
      formData.append("file", payload.mediaurl);
    }

    const response = await apiClient.post("/api/message/upload_dm", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error uploading DM:", error);
    throw error;
  }
};

//Used to fetch the messages in the channel of a server
export const fetchMessages = async (
  channel_id: string,
  offset: number = 0
): Promise<
  ApiResponse<Message[]> & {
    hasMore?: boolean;
    totalCount?: number;
  }
> => {
  try {
    const response = await apiClient.get<{
      messages?: Message[];
      data?: Message[];
      hasMore?: boolean;
      totalCount?: number;
    }>("/api/message/fetch", {
      params: {
        channel_id,
        offset,
      },
    });

    return {
      data: response.data.messages ?? response.data.data ?? [],
      hasMore: response.data.hasMore ?? false,
      totalCount: response.data.totalCount ?? 0,
    };
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

//Fetches the DM of the users
export const getUserDMs = async (
  options: { forceRefresh?: boolean; cacheTtlMs?: number } = {}
): Promise<any> => {
  const { forceRefresh = false, cacheTtlMs = DM_CACHE_TTL_MS } = options;
  let userId: string | null = null;

  try {
    const user = await getUser();
    if (!user || !user.id) {
      throw new Error("User not authenticated");
    }

    userId = user.id;

    const cached = userDmCache.get(userId);
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < cacheTtlMs) {
      return cached.response;
    }

    const inFlight = userDmInFlight.get(userId);
    if (!forceRefresh && inFlight) {
      return inFlight;
    }

    const request = (async () => {
      const response = await apiClient.get(`/api/message/${userId}/getDms`);

      const payload = {
        data: response.data,
        success: true,
      };

      userDmCache.set(userId!, {
        fetchedAt: Date.now(),
        response: payload,
      });

      return payload;
    })();

    userDmInFlight.set(user.id, request);

    return await request;
  } catch (error: any) {
    if (error?.code === "ECONNABORTED") {
      console.error(" Request timed out");
      throw new Error("Request timed out. Please try again.");
    }

    if (error.message === "User not authenticated") {
      console.error(" Authentication error:", error.message);
      throw new Error("Please login to view messages");
    }

    console.error("Error fetching DMs:", error.message || error);
    throw new Error("Failed to fetch messages. Please try again later.");
  } finally {
    if (userId) {
      userDmInFlight.delete(userId);
    }
  }
};

// Get unread message counts
export const getUnreadMessageCounts = async (): Promise<{
  unreadCounts: Record<string, number>;
  totalUnread: number;
}> => {
  try {
    const user = await getUser();
    if (!user || !user.id) {
      throw new Error("User not authenticated");
    }

    const response = await apiClient.get(
      `/api/message/${user.id}/unread-counts`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching unread counts:", error.message || error);
    return { unreadCounts: {}, totalUnread: 0 };
  }
};

// Mark thread as read
export const markThreadAsRead = async (threadId: string): Promise<void> => {
  try {
    const user = await getUser();
    if (!user || !user.id) {
      throw new Error("User not authenticated");
    }

    await apiClient.post(`/api/message/thread/${threadId}/mark-read`, {
      userId: user.id,
    });
  } catch (error: any) {
    console.error("Error marking thread as read:", error.message || error);
  }
};

export const getMessageReactions = async (
  target: ReactionTarget
): Promise<MessageReaction[]> => {
  const response = await apiClient.get("/api/message/reactions", {
    params: target,
  });
  return normalizeArray<MessageReaction>(response.data);
};

export const addMessageReaction = async (
  body: ReactionTarget & { emoji: string }
): Promise<void> => {
  await apiClient.post("/api/message/reactions", body);
};

export const removeMessageReaction = async (
  body: ReactionTarget & { emoji: string }
): Promise<void> => {
  await apiClient.delete("/api/message/reactions", { data: body });
};

export const searchServerMessages = async (
  serverId: string,
  query: string
): Promise<MessageSearchResult[]> => {
  const response = await apiClient.get(
    `/api/message/search/server/${serverId}`,
    { params: { q: query } }
  );
  return normalizeArray<MessageSearchResult>(response.data).map((item) => ({
    ...item,
    id: String(item.id ?? (item as any).message_id ?? ""),
  }));
};

export const searchDmMessages = async (
  threadId: string,
  query: string
): Promise<MessageSearchResult[]> => {
  const response = await apiClient.get(`/api/message/search/dm/${threadId}`, {
    params: { q: query },
  });
  return normalizeArray<MessageSearchResult>(response.data).map((item) => ({
    ...item,
    id: String(item.id ?? (item as any).dm_message_id ?? ""),
  }));
};

// export const getPinnedMessages = async (
//   context: PinContext
// ): Promise<PinnedMessage[]> => {
//   const response = await apiClient.get("/api/message/pins", {
//     params: context,
//   });
//   return normalizeArray<PinnedMessage>(response.data).map((pin) => ({
//     ...pin,
//     id: String(
//       pin.id ??
//         pin.message_id ??
//         pin.dm_message_id ??
//         (pin as any).pin_id ??
//         ""
//     ),
//     message_id: pin.message_id
//       ? String(pin.message_id)
//       : (pin as any).message?.id
//         ? String((pin as any).message.id)
//         : undefined,
//     dm_message_id: pin.dm_message_id
//       ? String(pin.dm_message_id)
//       : undefined,
//     content:
//       pin.content ??
//       (pin as any).message?.content ??
//       (pin as any).message?.message ??
//       "",
//     username:
//       pin.username ??
//       pin.sender_name ??
//       (pin as any).message?.username ??
//       (pin as any).message?.sender?.username,
//     timestamp:
//       pin.timestamp ??
//       (pin as any).message?.timestamp ??
//       pin.pinned_at,
//   }));
// };

// export const pinMessage = async (body: {
//   message_id?: string;
//   dm_message_id?: string;
// }): Promise<void> => {
//   await apiClient.post("/api/message/pins", body);
// };

// export const unpinMessage = async (body: {
//   message_id?: string;
//   dm_message_id?: string;
// }): Promise<void> => {
//   await apiClient.delete("/api/message/pins", { data: body });
// };
