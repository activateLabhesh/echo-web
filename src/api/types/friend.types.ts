export interface Friend {
  id: string;
  username: string;
  displayName?: string;
  status?: "online" | "offline" | "pending" | "blocked";
  avatarUrl?: string;
}

export interface FriendRequest {
  requestId: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: string;
}
