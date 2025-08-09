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
export const fetchProfile = async ():Promise<profile> => {
    const res = await api.get("/profile/getProfile");
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
    const response = await api.post("/auth/register", { email, username, password });
    return response.data;
};

export const login = async (identifier: string, password: string) => {
    const response = await api.post("/auth/login", { identifier, password });
    return response.data;
};

export const forgotPassword = async (email: string) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
};

export const resetPassword = async (newPassword: string, token: string) => {
    const response = await api.post(
        "/auth/reset-password",
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
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
