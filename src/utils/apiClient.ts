import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

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

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // This is crucial for cookie-based authentication
});

// Request interceptor - Add access token to all requests
apiClient.interceptors.request.use(
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
apiClient.interceptors.response.use(
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
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("tokenExpiry");
      localStorage.removeItem("user");
      sessionStorage.setItem("skipGlobalLoader", "1");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => apiClient(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Get refresh token from localStorage as fallback
      const refreshToken = localStorage.getItem("refresh_token");
      
      // Attempt to refresh the token - send refreshToken in body as fallback to cookies
      await apiClient.post('/api/auth/refresh', { refreshToken });
      
      // Token refreshed successfully, process queued requests
      processQueue(null);
      
      // Retry the original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed, process queue with error
      processQueue(refreshError as Error);
      
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
