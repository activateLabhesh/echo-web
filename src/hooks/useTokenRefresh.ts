// hooks/useTokenRefresh.ts
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { refreshToken } from '@/api';

// Type definition for token refresh response
interface TokenRefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export const useTokenRefresh = () => {
    const router = useRouter();
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const setupTokenRefresh = () => {
            const tokenExpiry = localStorage.getItem('tokenExpiry');
            
            if (!tokenExpiry) {
                console.log('No token expiry found');
                return;
            }

            const expiryTime = parseInt(tokenExpiry, 10);
            const currentTime = Date.now();
            const timeUntilExpiry = expiryTime - currentTime;

            // Refresh 5 minutes (300000ms) before expiry
            const REFRESH_BUFFER = 5 * 60 * 1000;
            const refreshTime = timeUntilExpiry - REFRESH_BUFFER;

            console.log(`Token expires in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`);
            console.log(`Will refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);

            if (refreshTime > 0) {
                // Schedule refresh before expiry
                refreshTimerRef.current = setTimeout(async () => {
                    console.log('Proactively refreshing token...');
                    const newTokens: TokenRefreshResponse | null = await refreshToken();
                    
                    if (newTokens) {
                        console.log('Token refreshed successfully');
                        // Tokens are already saved in refreshToken function
                        // Setup next refresh cycle
                        setupTokenRefresh();
                    } else {
                        console.error('Token refresh failed, redirecting to login');
                        handleLogout();
                    }
                }, refreshTime);
            } else if (timeUntilExpiry > 0) {
                // Token expires soon but not yet expired, refresh immediately
                console.log('Token expires soon, refreshing now...');
                refreshToken().then((newTokens: TokenRefreshResponse | null) => {
                    if (newTokens) {
                        console.log('Token refreshed successfully');
                        setupTokenRefresh();
                    } else {
                        console.error('Token refresh failed, redirecting to login');
                        handleLogout();
                    }
                });
            } else {
                // Token already expired, try to refresh
                console.log('Token expired, attempting refresh...');
                refreshToken().then((newTokens: TokenRefreshResponse | null) => {
                    if (newTokens) {
                        console.log('Expired token refreshed successfully');
                        setupTokenRefresh();
                    } else {
                        console.error('Cannot refresh expired token, redirecting to login');
                        handleLogout();
                    }
                });
            }
        };

        const handleLogout = () => {
            sessionStorage.setItem("skipGlobalLoader", "1");
            localStorage.removeItem("token");
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("tokenExpiry");
            localStorage.removeItem("user");
            router.push('/login');
        };

        // Initial setup
        setupTokenRefresh();

        // Cleanup on unmount
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, [router]);
};

// Optional: Hook to check if user is authenticated
export const useAuth = () => {
    const router = useRouter();

    useEffect(() => {
        const accessToken = localStorage.getItem('access_token');
        const tokenExpiry = localStorage.getItem('tokenExpiry');

        if (!accessToken || !tokenExpiry) {
            router.push('/login');
            return;
        }

        const expiryTime = parseInt(tokenExpiry, 10);
        const currentTime = Date.now();

        // If token is expired and no refresh happens, redirect
        if (currentTime > expiryTime) {
            console.log('Token expired on page load');
            refreshToken().then((newTokens: TokenRefreshResponse | null) => {
                if (!newTokens) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    localStorage.removeItem("tokenExpiry");
                    localStorage.removeItem("user");
                    router.push('/login');
                }
            });
        }
    }, [router]);
};