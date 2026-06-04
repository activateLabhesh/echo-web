import {apiClient} from "./axios";
import {FriendRequest, Friend} from "./types/friend.types";

export const addFriend = async (user2_id: string): Promise<FriendRequest> => {
  try {
    const response = await apiClient.post<FriendRequest>(`/api/friends/add_friend`, {
      user2_id,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error adding friend:", error?.response?.data || error.message);
    throw error;
  }
};

export const fetchFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    const response = await apiClient.get<FriendRequest[]>(
      `/api/friends/friend_requests`
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching friend requests:",
      error?.response?.data || error.message
    );
    throw error;
  }
};
export const removeFriend = async (
  friendId: string
): Promise<{ message: string }> => {
  try {
    if (!friendId) {
      throw new Error("Missing friend ID");
    }

    const response = await apiClient.delete(
      `/api/friends/${friendId}`
    );

    return response.data;
  } catch (error) {
    console.error("Error removing friend:", error);
    throw error;
  }
};

export const respondToFriendRequest = async (
  requestId: string,
  status: "accepted" | "rejected"
): Promise<FriendRequest> => {
  try {
    const response = await apiClient.put<FriendRequest>(`/api/friends/request`, {
      requestId,
      status,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error responding to friend request:", error?.response?.data || error.message);
    throw error;
  }
};


export const fetchAllFriends = async (): Promise<Friend[]> => {
  try {
    const response = await apiClient.get<Friend[]>(`/api/friends/all`);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching friends:",
      error?.response?.data || error.message
    );
    throw error;
  }
};
