
export interface ServerDetails {
    id: string;
    name: string;
    description?: string;
    icon_url?: string;
    owner_id: string;
    region?: string;
    isOwner?: boolean;
}
export interface Server {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface ServerMember {
    user_id: string;
    joined_at: string;
    users: {
        id: string;
        username: string;
        fullname: string;
        avatar_url: string;
    };
    user_roles: Array<{
        roles: {
            id: string;
            name: string;
            color: string;
        };
    }>;
}

export interface ServerInvite {
    id: string;
    use_limit: number | null;
    expiry: string | null;
    people_joined: number;
    is_valid: boolean;
    users: {
        username: string;
        fullname: string;
    };
}
