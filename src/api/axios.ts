import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { apiClient } from "@/utils/apiClient";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;

// Queue of requests waiting for token refresh
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

//Request interceptor - Add access token to all requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("access_token");
      if (accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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
      // Refresh failed or already retried, clear storage and redirect to home
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("tokenExpiry");
      localStorage.removeItem("user");
      sessionStorage.setItem("skipGlobalLoader", "1");
      window.location.href = "/";
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Get refresh token from localStorage
      const refreshToken = localStorage.getItem("refresh_token");
      
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      // Attempt to refresh the token
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        { refreshToken },
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;

      // Store new tokens
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", newRefreshToken);
      
      // Calculate and store expiry time
      const expiryTime = Date.now() + expiresIn * 1000;
      localStorage.setItem("tokenExpiry", expiryTime.toString());

      // Update default authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      
      // Update the failed request's authorization header
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }

      // Token refreshed successfully, process queued requests
      processQueue(null, accessToken);
      
      // Retry the original request
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed, process queue with error
      processQueue(refreshError as Error, null);
      
      // Clear local storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("tokenExpiry");
      localStorage.removeItem("user");
      sessionStorage.setItem("skipGlobalLoader", "1");
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


// Manual token refresh function (can be used proactively)
export const refreshToken = async (): Promise<{ 
    accessToken: string; 
    refreshToken: string; 
    expiresIn: number 
} | null> => {
    try {
        const refreshToken = localStorage.getItem("refresh_token");
        
        if (!refreshToken) {
            throw new Error("No refresh token available");
        }

        const response = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            { refreshToken },
            { 
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;

        // Update stored tokens
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", newRefreshToken);
        
        const expiryTime = Date.now() + expiresIn * 1000;
        localStorage.setItem("tokenExpiry", expiryTime.toString());

        // Update default header
        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

        return {
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn,
        };
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
};

// Initialize token from localStorage on app load
if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
        getToken(storedToken);
    }
}
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 403].includes(error.response?.status)) {
      console.error("Authentication Error:", error.response?.data);
    }
    return Promise.reject(error);
  }
);

export { apiClient };


