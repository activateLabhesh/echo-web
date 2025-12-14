"use client";
import { useState, useEffect } from "react";
import {
  Role,
  RoleCategory,
  getSelfAssignableRoles,
  selfAssignRole,
  selfUnassignRole,
  getMyRoles,
  getRoleCategories,
} from "../app/api";

interface SelfAssignRolesProps {
  serverId: string;
  onClose?: () => void;
}

export default function SelfAssignRoles({ serverId, onClose }: SelfAssignRolesProps) {
  const [selfAssignableRoles, setSelfAssignableRoles] = useState<Role[]>([]);
  const [myRoles, setMyRoles] = useState<Role[]>([]);
  const [categories, setCategories] = useState<RoleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!serverId) return;

      try {
        setLoading(true);
        const [rolesData, myRolesData, categoriesData] = await Promise.all([
          getSelfAssignableRoles(serverId),
          getMyRoles(serverId),
          getRoleCategories(serverId),
        ]);
        setSelfAssignableRoles(rolesData);
        setMyRoles(myRolesData);
        setCategories(categoriesData);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [serverId]);

  const handleToggleRole = async (role: Role) => {
    setActionLoading(role.id);
    setError(null);

    try {
      const hasRole = myRoles.some((r) => r.id === role.id);

      if (hasRole) {
        await selfUnassignRole(serverId, role.id);
        setMyRoles(myRoles.filter((r) => r.id !== role.id));
      } else {
        await selfAssignRole(serverId, role.id);
        setMyRoles([...myRoles, role]);
      }

      // Update the has_role status in selfAssignableRoles
      setSelfAssignableRoles(
        selfAssignableRoles.map((r) =>
          r.id === role.id ? { ...r, has_role: !hasRole } : r
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  // Group roles by category
  const groupedRoles = selfAssignableRoles.reduce(
    (acc, role) => {
      const categoryId = role.category_id || "uncategorized";
      if (!acc[categoryId]) acc[categoryId] = [];
      acc[categoryId].push(role);
      return acc;
    },
    {} as Record<string, Role[]>
  );

  const getCategoryName = (categoryId: string) => {
    if (categoryId === "uncategorized") return "Other Roles";
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Other Roles";
  };

  const getCategoryDescription = (categoryId: string) => {
    if (categoryId === "uncategorized") return null;
    const category = categories.find((c) => c.id === categoryId);
    return category?.description;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (selfAssignableRoles.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>No self-assignable roles available in this server.</p>
        <p className="text-sm mt-2">Contact server admins to create some!</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Pick Your Roles</h2>
          <p className="text-sm text-gray-400 mt-1">
            Select roles to customize your experience
          </p>
        </div>
        {onClose && (
          <button
            className="text-gray-400 hover:text-white text-2xl"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
          {error}
          <button
            className="float-right text-red-400 hover:text-red-300"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Your Current Roles */}
      {myRoles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            Your Roles
          </h3>
          <div className="flex flex-wrap gap-2">
            {myRoles.map((role) => (
              <span
                key={role.id}
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${role.color}20`,
                  color: role.color,
                  border: `1px solid ${role.color}`,
                }}
              >
                {role.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-700 my-4"></div>

      {/* Available Roles by Category */}
      {Object.entries(groupedRoles).map(([categoryId, roles]) => (
        <div key={categoryId} className="mb-6">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase">
              {getCategoryName(categoryId)}
            </h3>
            {getCategoryDescription(categoryId) && (
              <p className="text-xs text-gray-500 mt-1">
                {getCategoryDescription(categoryId)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const hasRole = myRoles.some((r) => r.id === role.id);
              const isLoading = actionLoading === role.id;

              return (
                <button
                  key={role.id}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                    ${
                      hasRole
                        ? "ring-2 ring-offset-2 ring-offset-[#2f3136]"
                        : "hover:scale-105"
                    }
                    ${isLoading ? "opacity-50 cursor-wait" : "cursor-pointer"}
                  `}
                  style={{
                    backgroundColor: hasRole ? `${role.color}30` : "#36393f",
                    color: hasRole ? role.color : "#b5bac1",
                    borderColor: role.color,
                    // ringColor is handled by Tailwind class
                  }}
                  onClick={() => handleToggleRole(role)}
                  disabled={isLoading}
                >
                  {/* Color indicator */}
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  
                  {/* Role name */}
                  <span>{role.name}</span>

                  {/* Checkmark for assigned roles */}
                  {hasRole && (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}

                  {/* Loading spinner */}
                  {isLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Info text */}
      <div className="mt-6 p-4 bg-[#36393f] rounded-lg">
        <p className="text-xs text-gray-400">
          💡 <strong>Tip:</strong> Click a role to add or remove it. Self-assignable
          roles help you access specific channels and show your interests to other
          members.
        </p>
      </div>
    </div>
  );
}
