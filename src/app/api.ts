// api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
// Queue of requests waiting for token refresh
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// Response interceptor for automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only handle 401 errors in browser environment
    if (typeof window === "undefined" || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Don't retry if this is already a retry attempt or if it's the refresh endpoint itself
    if (originalRequest._retry || originalRequest.url?.includes('/api/auth/refresh')) {
      // Refresh failed or already retried, redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => api(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Attempt to refresh the token
      await api.post('/api/auth/refresh');
      
      // Token refreshed successfully, process queued requests
      processQueue(null);
      
      // Retry the original request
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed, process queue with error
      processQueue(refreshError as Error);
      
      // Clear local storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export function getToken(token?: string) {
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
}

// Manual token refresh function (interceptor handles this automatically, but this can be used proactively)
export const refreshToken = async (): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> => {
    try {
        const response = await api.post('/api/auth/refresh');
        return {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            expiresIn: response.data.expiresIn,
        };
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
};

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

// ==================== ROLE API FUNCTIONS ====================

export interface Role {
    id: string;
    server_id: string;
    name: string;
    color: string;
    position: number;
    role_type: 'owner' | 'admin' | 'custom' | 'self_assignable';
    is_self_assignable: boolean;
    category_id: string | null;
    created_at: string;
    role_categories?: RoleCategory;
    has_role?: boolean; // For self-assignable roles
}

export interface RoleCategory {
    id: string;
    server_id: string;
    name: string;
    description: string | null;
    position: number;
    created_at: string;
}

// Get all roles for a server
export const getAllRoles = async (serverId: string): Promise<Role[]> => {
    const response = await api.get(`/api/roles/${serverId}/all`);
    return response.data;
};

// Get user's roles in a server
export const getMyRoles = async (serverId: string): Promise<Role[]> => {
    const response = await api.get(`/api/roles/${serverId}/my-roles`);
    return response.data;
};

// Get self-assignable roles
export const getSelfAssignableRoles = async (serverId: string): Promise<Role[]> => {
    const response = await api.get(`/api/roles/${serverId}/self-assignable`);
    return response.data;
};

// Self-assign a role
export const selfAssignRole = async (serverId: string, roleId: string): Promise<{ message: string; role: Role }> => {
    const response = await api.post(`/api/roles/${serverId}/self-assign`, { roleId });
    return response.data;
};

// Self-unassign a role
export const selfUnassignRole = async (serverId: string, roleId: string): Promise<{ message: string }> => {
    const response = await api.post(`/api/roles/${serverId}/self-unassign`, { roleId });
    return response.data;
};

// Create a new role (Owner/Admin)
export const createRole = async (serverId: string, data: {
    name: string;
    color?: string;
    position?: number;
    is_self_assignable?: boolean;
    category_id?: string;
}): Promise<Role> => {
    const response = await api.post(`/api/roles/${serverId}/create`, data);
    return response.data;
};

// Update a role (Owner/Admin)
export const updateRole = async (serverId: string, roleId: string, data: {
    name?: string;
    color?: string;
    position?: number;
    is_self_assignable?: boolean;
    category_id?: string;
}): Promise<Role> => {
    const response = await api.put(`/api/roles/${serverId}/${roleId}/update`, data);
    return response.data;
};

// Delete a role (Owner/Admin)
export const deleteRole = async (serverId: string, roleId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api/roles/${serverId}/${roleId}/delete`);
    return response.data;
};

// Assign role to user (Owner/Admin)
export const assignRoleToUser = async (serverId: string, userId: string, roleId: string): Promise<{ message: string }> => {
    const response = await api.post(`/api/roles/${serverId}/assign-to-user`, { userId, roleId });
    return response.data;
};

// Remove role from user (Owner/Admin)
export const removeRoleFromUser = async (serverId: string, userId: string, roleId: string): Promise<{ message: string }> => {
    const response = await api.post(`/api/roles/${serverId}/remove-from-user`, { userId, roleId });
    return response.data;
};

// Get role categories
export const getRoleCategories = async (serverId: string): Promise<RoleCategory[]> => {
    const response = await api.get(`/api/roles/${serverId}/categories`);
    return response.data;
};

// Create role category (Owner/Admin)
export const createRoleCategory = async (serverId: string, data: {
    name: string;
    description?: string;
    position?: number;
}): Promise<RoleCategory> => {
    const response = await api.post(`/api/roles/${serverId}/categories`, data);
    return response.data;
};

// Update role category (Owner/Admin)
export const updateRoleCategory = async (serverId: string, categoryId: string, data: {
    name?: string;
    description?: string;
    position?: number;
}): Promise<RoleCategory> => {
    const response = await api.put(`/api/roles/${serverId}/categories/${categoryId}`, data);
    return response.data;
};

// Delete role category (Owner/Admin)
export const deleteRoleCategory = async (serverId: string, categoryId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api/roles/${serverId}/categories/${categoryId}`);
    return response.data;
};

// ==================== CHANNEL ACCESS API FUNCTIONS ====================

export interface ChannelRoleAccess {
    id: string;
    role_id: string;
    roles: {
        id: string;
        name: string;
        color: string;
    };
}

// Get channel role access
export const getChannelRoleAccess = async (channelId: string): Promise<{
    is_private: boolean;
    allowed_roles: ChannelRoleAccess[];
}> => {
    const response = await api.get(`/api/channel/${channelId}/role-access`);
    return response.data;
};

// Set channel role access (Owner/Admin)
export const setChannelRoleAccess = async (channelId: string, data: {
    isPrivate: boolean;
    roleIds: string[];
}): Promise<{ message: string }> => {
    const response = await api.post(`/api/channel/${channelId}/role-access`, data);
    return response.data;
};

// Get channels with access filtering
export const getChannelsWithAccess = async (serverId: string): Promise<Array<{
    id: string;
    name: string;
    type: string;
    is_private: boolean;
}>> => {
    const response = await api.get(`/api/channel/${serverId}/channels-with-access`);
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
