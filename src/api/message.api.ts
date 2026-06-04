import { api, apiClient } from "./axios";
import { Message } from "./types/message.types";
import { ApiResponse } from "./types/common.types";
import { getUser } from "./profile.api";

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
