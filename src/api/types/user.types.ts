export interface SearchUser {
  id: string;
  username: string;
  fullname: string;
  avatar_url: string;
}

export interface BannedUser {
  server_id: string;
  user_id: string;
  banned_at: string;
  banned_by: string;
  reason: string | null;
  users: {
    id: string;
    username: string;
    fullname: string;
    avatar_url: string;
  } | null;
  banned_by_user: {
    id: string;
    username: string;
    fullname: string;
    avatar_url: string;
  } | null;
}
export interface SearchUserResult {
  id: string;
  username: string;
  fullname: string;
  avatar_url: string;
  status: string;
  relationshipStatus: "none" | "pending" | "accepted" | "rejected";
}
