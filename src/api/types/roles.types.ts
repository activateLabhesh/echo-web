export interface Role {
  id: string;
  server_id: string;
  name: string;
  color: string;
  position: number;
  role_type: "owner" | "admin" | "custom" | "self_assignable";
  is_self_assignable: boolean;
  category_id: string | null;
  created_at: string;
  role_categories?: RoleCategory;
  has_role?: boolean;
}

export interface RoleCategory {
  id: string;
  server_id: string;
  name: string;
  description: string | null;
  position: number;
  created_at: string;
}
