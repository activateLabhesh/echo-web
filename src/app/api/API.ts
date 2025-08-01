import { apiClient } from "@/utils/apiClient";

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
      "/newserver/create/",
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
    const response = await apiClient.get("/newserver/getServers/");
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
    // The endpoint should be designed to fetch channels for the authenticated user for a given server.
    const response = await apiClient.get(`/channel/${serverId}/getChannels`);
    return response.data;
  } catch (error) {
    console.error("Error fetching channels:", error);
    return null;
  }
};

// ---------- Message APIs ----------
export const uploadMessage = async (payload: {
  message: string;
  channelId: string;
  isDM: boolean;
}): Promise<Message> => {
  try {
    // The server will get the senderId from the authenticated user's session.
    const response = await apiClient.post<Message>(
      "/message/upload",
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading message:", error);
    throw error;
  }
};

export const fetchMessages = async (
  channelId: string,
  isDM: boolean = false,
  offset: number = 1
): Promise<ApiResponse<Message[]>> => {
  try {
    const response = await apiClient.get<{
      messages?: Message[];
      data?: Message[];
    }>(
      `/message/fetch?channel_id=${channelId}&is_dm=${isDM}&offset=${offset}`
    );

    const messages = response.data.messages || response.data.data || [];
    return { data: messages };
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

// ---------- Direct Messages ----------
// The server identifies the user from the cookie, so userId is not needed.
export const getUserDMs = async (): Promise<any> => {
  try {
    const response = await apiClient.get(`/dms`);
    return response.data;
  } catch (error: any) {
    if (error?.code === "ECONNABORTED") {
      console.error("Request timed out");
      throw new Error("Request timed out. Please try again.");
    }
    console.error("Error fetching DMs:", error.message || error);
    throw new Error("Error fetching DMs");
  }
};