import { apiClient } from "@/utils/apiClient";
import { getUser } from "../api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Warn if API URL is not configured
if (!API_BASE_URL && typeof window !== 'undefined') {
  console.warn('[API] NEXT_PUBLIC_API_URL is not set! Using apiClient baseURL instead.');
}

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

    const response = await apiClient.post('/api/message/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
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
    formData.append("sender_id", payload.sender_id);
    formData.append("content", payload.message || "");
    if (payload.mediaurl) formData.append("file", payload.mediaurl);

    const response = await apiClient.post('/api/message/upload_dm', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
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

    const messages = response.data.messages || response.data.data || [];
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
      console.error(" Request timed out");
      throw new Error("Request timed out. Please try again.");
    }
    
    if (error.message === 'User not authenticated') {
      console.error(" Authentication error:", error.message);
      throw new Error("Please login to view messages");
    }

    console.error("Error fetching DMs:", error.message || error);
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
    const response = await apiClient.post('/api/newserver/joinwithinvite', {
      inviteCode
    });

    return response.data;
  } catch (error: any) {
    console.error("Error joining server:", error.response?.data || error.message || error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to join server.";
    throw new Error(errorMessage);
  }
};

// Function to fetch user profile by ID
export const fetchUserProfile = async (userId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/api/profile/${userId}`);
    return response.data.user;
  } catch (error) {
    console.error(`Failed to fetch profile for user ${userId}:`, error);
    return null;
  }
};

// Cache for user profiles to avoid repeated API calls
const userProfileCache = new Map<string, any>();

export const getUserAvatar = async (userId: string): Promise<string> => {
  // Check cache first
  if (userProfileCache.has(userId)) {
    const profile = userProfileCache.get(userId);
    return profile?.avatar_url || "/User_profil.png";
  }

  try {
    const profile = await fetchUserProfile(userId);
    if (profile) {
      userProfileCache.set(userId, profile);
      return profile.avatar_url || "/User_profil.png";
    }
  } catch (error) {
    console.error(`Error fetching avatar for user ${userId}:`, error);
  }

  // Fallback to default avatar
  return "/User_profil.png";
};

export const deleteServer = async (serverId: string): Promise<any> => {
  try {
    const response = await apiClient.delete(`/api/newserver/${serverId}`);
    return response.data;
  } catch (error: any) {
    console.error("Error deleting server:", error.response?.data || error.message || error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to delete server.";
    throw new Error(errorMessage);
  }
};

export const transferServerOwnership = async (serverId: string, newOwnerId: string): Promise<any> => {
  try {
    const response = await apiClient.post(`/api/newserver/${serverId}/transfer-ownership`, {
      newOwnerId
    });
    return response.data;
  } catch (error: any) {
    console.error("Error transferring ownership:", error.response?.data || error.message || error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to transfer ownership.";
    throw new Error(errorMessage);
  }
};

export const getServerMembers = async (serverId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/api/newserver/${serverId}/members`);
    return response.data;
  } catch (error: any) {
    console.error("Error getting server members:", error.response?.data || error.message || error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to get server members.";
    throw new Error(errorMessage);
  }
};

// ---------- Chime Voice/Video APIs ----------

export interface ChimeMeetingResponse {
  meeting: {
    MeetingId: string;
    MediaPlacement: {
      AudioHostUrl: string;
      AudioFallbackUrl: string;
      SignalingUrl: string;
      TurnControlUrl: string;
      ScreenDataUrl: string;
      ScreenViewingUrl: string;
      ScreenSharingUrl: string;
    };
    ExternalMeetingId?: string;
  };
  attendee: {
    AttendeeId: string;
    ExternalUserId: string;
    JoinToken: string;
  };
}

/**
 * Join or create a Chime meeting for a voice channel
 * The backend handles creating the meeting if it doesn't exist
 */
export const joinChimeMeeting = async (channelId: string, userId: string): Promise<ChimeMeetingResponse> => {
  try {
    const response = await apiClient.post<ChimeMeetingResponse>('/api/chime/join', {
      channelId,
      userId
    });
    return response.data;
  } catch (error: any) {
    console.error("Error joining Chime meeting:", error.response?.data || error.message || error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to join voice channel.";
    throw new Error(errorMessage);
  }
};

/**
 * Leave a Chime meeting
 */
export const leaveChimeMeeting = async (channelId: string, attendeeId: string): Promise<void> => {
  try {
    await apiClient.post('/api/chime/leave', {
      channelId,
      attendeeId
    });
  } catch (error: any) {
    console.error("Error leaving Chime meeting:", error.response?.data || error.message || error);
    // Don't throw on leave - it's okay if this fails
  }
};

/**
 * Get active attendees in a Chime meeting
 */
export const getChimeMeetingAttendees = async (channelId: string): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/api/chime/attendees/${channelId}`);
    return response.data.attendees || [];
  } catch (error: any) {
    console.error("Error getting Chime attendees:", error.response?.data || error.message || error);
    return [];
  }
};

/**
 * Start recording for a Chime meeting (server-side media capture)
 */
export const startChimeRecording = async (channelId: string): Promise<{ recordingId: string }> => {
  try {
    const response = await apiClient.post('/api/chime/recording/start', {
      channelId
    });
    return response.data;
  } catch (error: any) {
    console.error("Error starting Chime recording:", error.response?.data || error.message || error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to start recording.";
    throw new Error(errorMessage);
  }
};

/**
 * Stop recording for a Chime meeting
 */
export const stopChimeRecording = async (channelId: string, recordingId: string): Promise<void> => {
  try {
    await apiClient.post('/api/chime/recording/stop', {
      channelId,
      recordingId
    });
  } catch (error: any) {
    console.error("Error stopping Chime recording:", error.response?.data || error.message || error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to stop recording.";
    throw new Error(errorMessage);
  }
};

