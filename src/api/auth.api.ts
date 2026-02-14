import { api, getToken } from "./axios";


export const register = async (email: string, username: string, password: string) => {
    const response = await api.post("/api/auth/register", { email, username, password });
    return response.data;
};

export const login = async (identifier: string, password: string) => {
    const response = await api.post("/api/auth/login", { identifier, password });
    
    // Store tokens after successful login
    if (response.data.accessToken) {
        localStorage.setItem("access_token", response.data.accessToken);
        localStorage.setItem("refresh_token", response.data.refreshToken);
        
        // Calculate and store expiry time
        const expiryTime = Date.now() + response.data.expiresIn * 1000;
        localStorage.setItem("tokenExpiry", expiryTime.toString());
        
        // Store user data
        if (response.data.user) {
            localStorage.setItem("user", JSON.stringify(response.data.user));
        }
        
        // Set authorization header
        getToken(response.data.accessToken);
    }
    
    return response.data;
};


export const handleOAuthLogin = async (accessToken: string, refreshToken?: string) => {
    const response = await api.post(
        "/api/auth/oauth-user",
        { refreshToken }, // Send refresh token in body for backend to set cookie
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
        if (typeof window !== "undefined") {
            sessionStorage.setItem("skipGlobalLoader", "1");
        }

        const res = await api.get("/api/auth/logout");
        
        // Clear all stored tokens and user data
        localStorage.removeItem("token");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("tokenExpiry");
        localStorage.removeItem("user");
        
        // Clear authorization header
        delete api.defaults.headers.common["Authorization"];
        
        return res.data;
    } catch (err) {
        console.error("Logout error:", err);
        throw err;
    }
};


