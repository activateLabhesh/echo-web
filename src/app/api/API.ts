import { apiClient } from "@/utils/apiClient";

import { getUser } from "../api";
import { get } from "http";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ---------- Types ----------
export interface Server {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface Message {
  id?: string;
  name: string;
  seed: string;
  color: string;
  message: string;
  timestamp: string;
  media_url?: string; // Add media_url field for image support
  mediaUrl?: string; // Also support camelCase variant
  content?: string; // Add content field as backend uses this
  sender_id?: string; // Add sender_id field
  channel_id?: string; // Add channel_id field
}

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}


// ---------- Axios Setup ----------
// The apiClient is configured to send credentials (like cookies) with each request.
// This removes the need for manual token handling on the client-side.


// The response interceptor remains to handle authentication errors globally.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle auth errors, e.g., redirect to login if session expires
    if ([401, 403].includes(error.response?.status)) {
      console.error("Authentication Error:", error.response?.data);
      // Optionally, you could trigger a redirect to a login page here.
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---------- Server APIs ----------
export const createServer = async (payload: {
  name: string;
  icon?: File;
}): Promise<Server> => {
  try {
    const formData = new FormData();
    formData.append("name", payload.name);
    if (payload.icon) {
      formData.append("icon", payload.icon);
    }

    // The server will identify the owner from the session cookie.
    const response = await apiClient.post<Server>(
      "/api/newserver/create/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating server:", error);
    throw error;
  }
};

export const fetchServers = async (): Promise<Server[]> => {
  try {
    const response = await apiClient.get(`/api/newserver/getServers/`);
    console.log("response.data")
    return response.data;
  } catch (error) {
    console.error("Error fetching servers:", error);
    throw error;
  }
};

// ---------- Channel APIs ----------
// The server can identify the user from the request cookie, so userId is not needed.
export const fetchChannelsByServer = async (serverId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/api/channel/${serverId}/getChannels`);
    return response.data;
  } catch (error) {
    console.error("Error fetching channels:", error);
    return null;
  }
};

// ---------- Message APIs ----------
export const uploadMessage = async (payload: {
  file?: File;
  content?: string;
  sender_id?: string; // Optional, server can get from session
  channel_id: string;
}): Promise<Message> => {
  try {
    const formData = new FormData();
    
    // Use exact field names as specified by backend
    formData.append("sender_id", payload.sender_id || "");
    formData.append("channel_id", payload.channel_id);
    formData.append("content", payload.content || "");
    if (payload.file) formData.append("file", payload.file);

    const response = await fetch(`${API_BASE_URL}/api/message/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include' // As specified by backend
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errorMessage = err.error || err.msg || 'Upload failed';
      console.error('Upload error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('[Upload Message] Success:', result);
    return result;
  } catch (error) {
    console.error("Error uploading message:", error);
    throw error;
  }
};

export const uploaddm = async (payload: {
  mediaurl?: File;
  message: string;
  sender_id: string;
  receiver_id: string;
}) => {
  try {
    const formData = new FormData();
    
    // Use exact field names as specified by backend
    formData.append("receiver_id", payload.receiver_id);
    formData.append("content", payload.message || "");
    if (payload.mediaurl) formData.append("file", payload.mediaurl);

    const response = await fetch(`${API_BASE_URL}/api/message/upload_dm`, {
      method: 'POST',
      body: formData,
      credentials: 'include' // As specified by backend
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errorMessage = err.error || err.msg || 'DM upload failed';
      console.error('DM Upload error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('[Upload DM] Success:', result);
    return result;
  } catch (error) {
    console.error("Error uploading DM:", error);
    throw error;
  }
};

export const fetchMessages = async (channel_id: string): Promise<ApiResponse<Message[]>> => {
  try {
    const response = await apiClient.get<{
      messages?: Message[];
      data?: Message[];
    }>(
      `/api/message/fetch?channel_id=${channel_id}`
    );
    console.log('API Response for fetchMessages:', response.data);

    const messages = response.data.messages || response.data.data || [];
    
    // Log each message to verify media_url field
    messages.forEach((msg: any, index: number) => {
      if (msg.media_url) {
        console.log(`Message ${index} has media_url:`, msg.media_url);
      }
    });
    
    return { data: messages };
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

// ---------- Direct Messages ----------
// Fetch user's direct messages with error handling
export const getUserDMs = async (): Promise<any> => {
  try {
    const user = await getUser();
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }

    console.log("Fetching DMs for user:", user.id);
    const response = await apiClient.get(`/api/message/${user.id}/getDms`);
    
    return {
      data: response.data,
      success: true
    };
  } catch (error: any) {
    if (error?.code === "ECONNABORTED") {
      console.error("❌ Request timed out");
      throw new Error("Request timed out. Please try again.");
    }
    
    if (error.message === 'User not authenticated') {
      console.error("❌ Authentication error:", error.message);
      throw new Error("Please login to view messages");
    }

    console.error("❌ Error fetching DMs:", error.message || error);
    throw new Error("Failed to fetch messages. Please try again later.");
  }
};


// ---------- Friends APIs ----------


export interface Friend {
  id: string;
  username: string;
  displayName?: string;
  status?: "online" | "offline" | "pending" | "blocked";
  avatarUrl?: string;
}

export interface FriendRequest {
  requestId: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: string;
}

// ---------- API Functions ----------

export const addFriend = async (user2_id: string): Promise<FriendRequest> => {
  try {
    const response = await apiClient.post<FriendRequest>(`/api/friends/add_friend`, {
      user2_id,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error adding friend:", error?.response?.data || error.message);
    throw error;
  }
};


export const fetchFriendRequests = async (
  user2_id: string
): Promise<FriendRequest[]> => {
  try {
    const response = await apiClient.get<FriendRequest[]>(
      `/api/friends/friend_requests`,
      {
        params: { user2_id }, 
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching friend requests:",
      error?.response?.data || error.message
    );
    throw error;
  }
};


export const respondToFriendRequest = async (
  requestId: string,
  status: "accepted" | "rejected"
): Promise<FriendRequest> => {
  try {
    const response = await apiClient.put<FriendRequest>(`/api/friends/request`, {
      requestId,
      status,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error responding to friend request:", error?.response?.data || error.message);
    throw error;
  }
};


export const fetchAllFriends = async (
  requestId: string,
  status: "accepted" | "rejected" = "accepted"
): Promise<Friend[]> => {
  try {
    const response = await apiClient.get<Friend[]>(`/api/friends/all`, {
      params: { requestId, status }, 
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching friends:",
      error?.response?.data || error.message
    );
    throw error;
  }
};


export const joinServer = async (inviteCode: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/newserver/joinServer/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ inviteCode }),
      credentials: "include",
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.error || err.message || "Failed to join server.";
      throw new Error(msg);
    }

    const data = await response.json();
    console.log("[Join Server] Success:", data);
    return data;
  } catch (error: any) {
    console.error("❌ Error joining server:", error.message || error);
    throw new Error(error.message || "Failed to join server.");
  }
};

