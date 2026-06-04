export interface ChannelRoleAccess {
  id: string;
  role_id: string;
  roles: {
    id: string;
    name: string;
    color: string;
  };
}

export interface ChannelData {
  name: string;
  type: "text" | "voice";
  is_private?: boolean;
  channel_type?: "normal" | "read_only" | "role_restricted";
  allowed_role_ids?: string[];
  moderator_role_ids?: string[];
}
