import { apiClient } from '@/utils/apiClient';

export interface User {
    id: string;
    email: string;
    username: string;
    fullname: string;
    avatar_url: string | null;
    bio: string;
    date_of_birth: string;
    status: string;
    created_at: string;
}

export const register = async (
    email: string,
    username:string,
    password: string
): Promise<any> => {
    try {
        const response = await apiClient.post('/auth/register', {
            email,
            username,
            password,
        });
        return response.data;
    } catch (error) {
        console.error("Error during registration:", error);
        throw error;
    }
};

export const login = async (
    identifier: string,
    password: string
  ): Promise<any> => {
    try {
      const response = await apiClient.post('/auth/login', {
        identifier,
        password,
      });
      // The browser will automatically handle the Set-Cookie header from the response
      // because `withCredentials: true` is configured on the apiClient instance.
      return response.data;
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  };

export const forgotPassword = async (email: string): Promise<any> => {
    try {
        const response = await apiClient.post('/auth/forgot-password', {
            email,
        });
        return response.data;
    } catch (error) {
        console.error("Error during forgot password request:", error);
        throw error;
    }
}

export const resetPassword = async (newPassword: string, token: string): Promise<any> => {
    try {
        const response = await apiClient.post(
            '/auth/reset-password',
            { new_password: newPassword },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error during password reset:", error);
        throw error;
    }
}

export async function getUser(): Promise<User | null> {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
        return JSON.parse(storedUser) as User;
    }
    return null;
}