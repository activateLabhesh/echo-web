import { apiClient } from "./axios";
import { profile } from "./types/profile.types";

export const fetchProfile = async (): Promise<profile> => {
  if (typeof window === "undefined") throw new Error("Client only");

  const res = await apiClient.get("/api/profile/getProfile");
  return res.data.user;
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

export async function getUser(): Promise<profile | null> {
  if (typeof window !== "undefined") {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      return JSON.parse(storedUser) as profile;
    }
  }
  return null;
}

const userProfileCache = new Map<string, any>();
const inflight = new Map<string, Promise<any>>();
const DEFAULT_AVATAR = "/User_profil.png";

export const getUserAvatar = async (userId: string): Promise<string> => {
  if (!userId) return DEFAULT_AVATAR;

  // Cache hit
  const cached = userProfileCache.get(userId);
  if (cached) {
    return cached.avatar_url || DEFAULT_AVATAR;
  }

  // Inflight dedupe
  if (inflight.has(userId)) {
    const profile = await inflight.get(userId);
    return profile?.avatar_url || DEFAULT_AVATAR;
  }

  const request = fetchUserProfile(userId)
    .then((profile) => {
      if (profile) userProfileCache.set(userId, profile);
      return profile;
    })
    .catch(() => null)
    .finally(() => inflight.delete(userId));

  inflight.set(userId, request);

  const profile = await request;
  return profile?.avatar_url || DEFAULT_AVATAR;
};
