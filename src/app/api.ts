// api.ts
import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

export function getToken(token?: string) {
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
}

if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
        getToken(storedToken);
    }
}
export const fetchProfile = async (): Promise<profile> => {
    if (typeof window === "undefined") throw new Error("Client only");

    const res = await api.get("/api/profile/getProfile", {
        withCredentials: true,
    });

    return res.data.user;
};

export interface profile {
    id: string;
    email: string;
    username: string;
    fullname: string;
    avatar_url: string | null;
    bio: string | null;
    date_of_birth: string;
    status: string;
    created_at: string;
}

export const register = async (email: string, username: string, password: string) => {
    const response = await api.post("/api/auth/register", { email, username, password });
    return response.data;
};

export const login = async (identifier: string, password: string) => {
    const response = await api.post("/api/auth/login", { identifier, password });
    return response.data;
};

export const handleOAuthLogin = async (accessToken: string) => {
    const response = await api.post(
        "/api/auth/oauth-user",
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data;
};

export const forgotPassword = async (email: string) => {
    const response = await api.post("/api/auth/forgot-password", { email });
    return response.data;
};

export const resetPassword = async (newPassword: string, accessToken: string) => {
    const response = await api.post(
        "/api/auth/reset-password",
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data;
};

export const logout = async () => {
    try {
        const res = await api.get("/api/auth/logout");
        return res.data;
    } catch (err) {
        console.error("Logout error:", err);
        throw err;
    }
};

export async function getUser(): Promise<profile | null> {
    if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            return JSON.parse(storedUser) as profile;
        }
    }
    return null;
}

// Server Settings API Functions
export interface ServerDetails {
    id: string;
    name: string;
    description?: string;
    icon_url?: string;
    owner_id: string;
    region?: string;
    created_at: string;
    isOwner?: boolean; // Add this computed property
}

export interface ServerMember {
    user_id: string;
    joined_at: string;
    users: {
        id: string;
        username: string;
        fullname: string;
        avatar_url: string;
    };
    user_roles: Array<{
        roles: {
            id: string;
            name: string;
            color: string;
        };
    }>;
}

export interface ServerInvite {
    id: string;
    use_limit: number | null;
    expiry: string | null;
    people_joined: number;
    is_valid: boolean;
    created_at: string;
    users: {
        username: string;
        fullname: string;
    };
}

export interface SearchUser {
    id: string;
    username: string;
    fullname: string;
    avatar_url: string;
}

// Get server details
export const getServerDetails = async (serverId: string): Promise<ServerDetails> => {
    const [serverResponse, user] = await Promise.all([
        api.get(`/api/newserver/${serverId}`),
        getUser()
    ]);
    
    const serverData = serverResponse.data;
    const isOwner = user?.id === serverData.owner_id;
    
    return {
        ...serverData,
        isOwner
    };
};

// Update server
export const updateServer = async (serverId: string, data: { name?: string }, iconFile?: File): Promise<ServerDetails> => {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (iconFile) formData.append('icon', iconFile);

    const response = await api.put(`/api/newserver/${serverId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.server;
};

// Get server members
export const getServerMembers = async (serverId: string): Promise<ServerMember[]> => {
    const response = await api.get(`/api/newserver/${serverId}/members`);
    return response.data;
};

// Kick member
export const kickMember = async (serverId: string, userId: string): Promise<void> => {
    await api.delete(`/api/newserver/${serverId}/members/${userId}/kick`);
};

// Ban member
export const banMember = async (serverId: string, userId: string, reason?: string): Promise<void> => {
    await api.post(`/api/newserver/${serverId}/members/${userId}/ban`, { reason });
};

// Add user to server
export const addUserToServer = async (serverId: string, username: string): Promise<void> => {
    await api.post(`/api/newserver/${serverId}/members`, { username });
};

// Search users
export const searchUsers = async (query: string): Promise<SearchUser[]> => {
    const response = await api.get(`/api/newserver/search/users?q=${encodeURIComponent(query)}`);
    return response.data;
};

// Get server invites
export const getServerInvites = async (serverId: string): Promise<ServerInvite[]> => {
    const response = await api.get(`/api/newserver/${serverId}/invites`);
    return response.data;
};

// Create server invite
export const createServerInvite = async (serverId: string, options: { expiresAfter?: string; maxUses?: string }): Promise<{ invite: ServerInvite & { inviteLink: string } }> => {
    const response = await api.post(`/api/newserver/${serverId}/invites`, options);
    return response.data;
};

// Delete invite
export const deleteInvite = async (inviteId: string): Promise<void> => {
    await api.delete(`/api/invites/${inviteId}`);
};

// Leave server
export const leaveServer = async (serverId: string): Promise<void> => {
    await api.post(`/api/newserver/${serverId}/leave`);
};

// Delete server
export const deleteServer = async (serverId: string): Promise<void> => {
    await api.delete(`/api/newserver/${serverId}`);
};

// Get available permissions
export const getAvailablePermissions = async (): Promise<string[]> => {
    const response = await api.get('/api/roles/permissions');
    return response.data;
};

// Test POST endpoint (for debugging)
export const testDirectPost = async (): Promise<any> => {
    console.log('Testing direct POST to backend...');
    const response = await api.post('/test-post-direct', { test: 'data' });
    return response.data;
};

export interface ChannelData {
  name: string;
  type: "text" | "voice";
  is_private: boolean;
}

export const createChannel = async (serverId: string, data: ChannelData) => {
  if (!serverId) throw new Error("Missing server ID");


  const response = await api.post(`/api/channel/${serverId}/NewChannel`, data, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data;
};