"use client";
import { useState, useEffect } from "react";
import {
  Role as RoleType,
  RoleCategory,
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  getRoleCategories,
  createRoleCategory,
  deleteRoleCategory,
  getSelfAssignableRoles,
  getMyRoles,
  selfAssignRole,
  selfUnassignRole,
} from "../../../api";

interface RoleProps {
  serverId: string;
  isOwner: boolean;
  isAdmin: boolean;
}

export default function Role({ serverId, isOwner, isAdmin }: RoleProps) {
  const canManageRoles = isOwner || isAdmin;

  // If not owner/admin, show member view
  if (!canManageRoles) {
    return <MemberRoleView serverId={serverId} />;
  }

  // Admin/Owner view
  return <AdminRoleView serverId={serverId} isOwner={isOwner} isAdmin={isAdmin} />;
}

// ==================== MEMBER VIEW ====================
function MemberRoleView({ serverId }: { serverId: string }) {
  const [selfAssignableRoles, setSelfAssignableRoles] = useState<RoleType[]>([]);
  const [myRoles, setMyRoles] = useState<RoleType[]>([]);
  const [categories, setCategories] = useState<RoleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Track selected roles (for multi-select)
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

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
        
        // Filter out owner and admin roles
        const filteredRoles = rolesData.filter(
          (r: RoleType) => r.role_type !== 'owner' && r.role_type !== 'admin'
        );
        
        setSelfAssignableRoles(filteredRoles);
        setMyRoles(myRolesData);
        setCategories(categoriesData);
        
        // Initialize selected roles with current user roles
        const myRoleIds = new Set(myRolesData.map((r: RoleType) => r.id));
        setSelectedRoleIds(myRoleIds);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [serverId]);

  const toggleRole = (roleId: string) => {
    const newSelected = new Set(selectedRoleIds);
    if (newSelected.has(roleId)) {
      newSelected.delete(roleId);
    } else {
      newSelected.add(roleId);
    }
    setSelectedRoleIds(newSelected);
    
    // Check if there are changes from original
    const myRoleIds = new Set(myRoles.map(r => r.id));
    const newSelectedArr = Array.from(newSelected);
    const myRoleIdsArr = Array.from(myRoleIds);
    const hasChanges = 
      newSelectedArr.some(id => !myRoleIds.has(id)) ||
      myRoleIdsArr.some(id => selfAssignableRoles.some(r => r.id === id) && !newSelected.has(id));
    setHasChanges(hasChanges);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const myRoleIds = new Set(myRoles.map(r => r.id));
      const selectedArr = Array.from(selectedRoleIds);
      const myRoleIdsArr = Array.from(myRoleIds);
      
      // Find roles to add and remove
      const rolesToAdd = selectedArr.filter(id => !myRoleIds.has(id));
      const rolesToRemove = myRoleIdsArr.filter(id => 
        selfAssignableRoles.some(r => r.id === id) && !selectedRoleIds.has(id)
      );

      // Process additions
      for (const roleId of rolesToAdd) {
        await selfAssignRole(serverId, roleId);
      }

      // Process removals
      for (const roleId of rolesToRemove) {
        await selfUnassignRole(serverId, roleId);
      }

      // Refresh my roles
      const updatedMyRoles = await getMyRoles(serverId);
      setMyRoles(updatedMyRoles);
      setHasChanges(false);
      setSuccess("Roles updated successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update roles");
    } finally {
      setSaving(false);
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
    {} as Record<string, RoleType[]>
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
      <div className="max-w-2xl mx-auto p-8 text-white">
        <h1 className="text-2xl font-bold mb-4">Pick Your Roles</h1>
        <div className="bg-[#2f3136] rounded-lg p-6 text-center">
          <p className="text-gray-400">No self-assignable roles available in this server.</p>
          <p className="text-sm text-gray-500 mt-2">Contact server admins to create some!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 text-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Pick Your Roles</h1>
        <p className="text-sm text-gray-400 mt-1">
          Select roles to customize your experience and access specific channels
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
          <button className="float-right" onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Your Current Roles */}
      {myRoles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Your Current Roles</h3>
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

      <div className="border-t border-gray-700 my-6"></div>

      {/* Available Roles by Category */}
      {Object.entries(groupedRoles).map(([categoryId, roles]) => (
        <div key={categoryId} className="mb-6">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase">
              {getCategoryName(categoryId)}
            </h3>
            {getCategoryDescription(categoryId) && (
              <p className="text-xs text-gray-500 mt-1">{getCategoryDescription(categoryId)}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const isSelected = selectedRoleIds.has(role.id);
              return (
                <button
                  key={role.id}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                    ${isSelected 
                      ? "ring-2 ring-offset-2 ring-offset-[#2f3136]" 
                      : "hover:scale-105"
                    }
                  `}
                  style={{
                    backgroundColor: isSelected ? `${role.color}30` : "#36393f",
                    color: isSelected ? role.color : "#b5bac1",
                    // @ts-ignore - ringColor works with CSS custom properties
                    "--tw-ring-color": role.color,
                  }}
                  onClick={() => toggleRole(role.id)}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <span>{role.name}</span>
                  {isSelected && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          className={`px-6 py-3 rounded-lg font-bold transition-all duration-200 ${
            hasChanges && !saving
              ? "bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] hover:from-[#ffcc33] hover:to-[#ffb347]"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          }`}
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              Saving...
            </span>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-[#36393f] rounded-lg">
        <p className="text-xs text-gray-400">
          💡 <strong>Tip:</strong> Click roles to select/deselect them, then click "Save Changes" to apply.
          Roles help you access specific channels and show your interests to other members.
        </p>
      </div>
    </div>
  );
}

// ==================== ADMIN VIEW ====================
function AdminRoleView({ serverId, isOwner, isAdmin }: { serverId: string; isOwner: boolean; isAdmin: boolean }) {
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [categories, setCategories] = useState<RoleCategory[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New role form state
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#99aab5");
  const [newRoleSelfAssignable, setNewRoleSelfAssignable] = useState(false);
  const [newRoleCategory, setNewRoleCategory] = useState<string>("");

  // New category form state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  // Fetch roles and categories
  useEffect(() => {
    const fetchData = async () => {
      if (!serverId) return;

      try {
        setLoading(true);
        const [rolesData, categoriesData] = await Promise.all([
          getAllRoles(serverId),
          getRoleCategories(serverId),
        ]);
        setRoles(rolesData);
        setCategories(categoriesData);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load roles");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [serverId]);

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      setSaving(true);
      const newRole = await createRole(serverId, {
        name: newRoleName,
        color: newRoleColor,
        is_self_assignable: newRoleSelfAssignable,
        category_id: newRoleCategory || undefined,
      });

      setRoles([...roles, newRole]);
      setNewRoleName("");
      setNewRoleColor("#99aab5");
      setNewRoleSelfAssignable(false);
      setNewRoleCategory("");
      setShowAddPopup(false);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create role");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      setSaving(true);
      const newCategory = await createRoleCategory(serverId, {
        name: newCategoryName,
        description: newCategoryDescription || undefined,
      });

      setCategories([...categories, newCategory]);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowCategoryPopup(false);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectRole = (role: RoleType) => {
    // Don't allow editing owner role
    if (role.role_type === "owner" && !isOwner) return;
    setSelectedRole({ ...role });
  };

  const handleEditRole = (field: keyof RoleType, value: any) => {
    if (!selectedRole) return;
    setSelectedRole({ ...selectedRole, [field]: value });
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;

    try {
      setSaving(true);
      const updatedRole = await updateRole(serverId, selectedRole.id, {
        name: selectedRole.name,
        color: selectedRole.color,
        is_self_assignable: selectedRole.is_self_assignable,
        category_id: selectedRole.category_id || undefined,
      });

      setRoles(roles.map((r) => (r.id === updatedRole.id ? updatedRole : r)));
      setSelectedRole(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    // Prevent deleting owner role
    if (role.role_type === "owner") {
      setError("Cannot delete the owner role");
      return;
    }

    // Only owner can delete admin role
    if (role.role_type === "admin" && !isOwner) {
      setError("Only the owner can delete the admin role");
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${role.name}" role?`)) return;

    try {
      setSaving(true);
      await deleteRole(serverId, roleId);
      setRoles(roles.filter((r) => r.id !== roleId));
      setSelectedRole(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete role");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    if (!confirm(`Are you sure you want to delete the "${category.name}" category?`)) return;

    try {
      await deleteRoleCategory(serverId, categoryId);
      setCategories(categories.filter((c) => c.id !== categoryId));
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete category");
    }
  };

  const getRoleTypeLabel = (type: string) => {
    switch (type) {
      case "owner":
        return "👑 Owner";
      case "admin":
        return "⚡ Admin";
      case "self_assignable":
        return "✋ Self-Assignable";
      default:
        return "📋 Custom";
    }
  };

  const getRoleTypeBadgeColor = (type: string) => {
    switch (type) {
      case "owner":
        return "bg-yellow-500/20 text-yellow-400";
      case "admin":
        return "bg-orange-500/20 text-orange-400";
      case "self_assignable":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  // Group roles by category
  const groupedRoles = roles.reduce(
    (acc, role) => {
      const categoryId = role.category_id || "uncategorized";
      if (!acc[categoryId]) acc[categoryId] = [];
      acc[categoryId].push(role);
      return acc;
    },
    {} as Record<string, RoleType[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  const canManageRoles = isOwner || isAdmin;

  return (
    <div className="max-w-2xl mx-auto p-8 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage server roles and self-assignable roles
          </p>
        </div>
        {canManageRoles && (
          <div className="flex gap-2">
            <button
              className="bg-[#36393f] text-white px-4 py-2 rounded-lg hover:bg-[#40444b] transition"
              onClick={() => setShowCategoryPopup(true)}
              title="Create Category"
            >
              + Category
            </button>
            <button
              className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded-lg px-4 py-2 shadow hover:from-[#ffcc33] hover:to-[#ffb347] transition"
              onClick={() => setShowAddPopup(true)}
              title="Create New Role"
            >
              + Role
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
          <button
            className="float-right text-red-400 hover:text-red-300"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* System Roles Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-300">System Roles</h2>
        <div className="flex gap-3 flex-wrap">
          {roles
            .filter((r) => r.role_type === "owner" || r.role_type === "admin")
            .map((role) => (
              <div
                key={role.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-medium border-2 transition-all duration-200
                  ${
                    selectedRole?.id === role.id
                      ? "border-[#ed4245] bg-[#23272a] scale-105"
                      : "border-[#36393f] text-[#b5bac1] hover:bg-[#23272a] hover:scale-105"
                  }
                `}
                onClick={() => handleSelectRole(role)}
              >
                <span
                  className="w-4 h-4 rounded-full border border-[#72767d]"
                  style={{ background: role.color }}
                />
                <span>{role.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${getRoleTypeBadgeColor(
                    role.role_type
                  )}`}
                >
                  {getRoleTypeLabel(role.role_type)}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Categories Section */}
      {categories.map((category) => (
        <div key={category.id} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-300">{category.name}</h2>
              {category.description && (
                <p className="text-sm text-gray-500">{category.description}</p>
              )}
            </div>
            {canManageRoles && (
              <button
                className="text-red-400 hover:text-red-300 text-sm"
                onClick={() => handleDeleteCategory(category.id)}
              >
                Delete Category
              </button>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            {(groupedRoles[category.id] || []).map((role) => (
              <div
                key={role.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-medium border-2 transition-all duration-200
                  ${
                    selectedRole?.id === role.id
                      ? "border-[#ed4245] bg-[#23272a] scale-105"
                      : "border-[#36393f] text-[#b5bac1] hover:bg-[#23272a] hover:scale-105"
                  }
                `}
                onClick={() => handleSelectRole(role)}
              >
                <span
                  className="w-4 h-4 rounded-full border border-[#72767d]"
                  style={{ background: role.color }}
                />
                <span>{role.name}</span>
                {role.is_self_assignable && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                    ✋ Self-Assign
                  </span>
                )}
              </div>
            ))}
            {(!groupedRoles[category.id] || groupedRoles[category.id].length === 0) && (
              <p className="text-gray-500 text-sm">No roles in this category</p>
            )}
          </div>
        </div>
      ))}

      {/* Uncategorized Roles */}
      {groupedRoles["uncategorized"]?.filter(
        (r) => r.role_type !== "owner" && r.role_type !== "admin"
      ).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-300">Other Roles</h2>
          <div className="flex gap-3 flex-wrap">
            {groupedRoles["uncategorized"]
              ?.filter((r) => r.role_type !== "owner" && r.role_type !== "admin")
              .map((role) => (
                <div
                  key={role.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-medium border-2 transition-all duration-200
                    ${
                      selectedRole?.id === role.id
                        ? "border-[#ed4245] bg-[#23272a] scale-105"
                        : "border-[#36393f] text-[#b5bac1] hover:bg-[#23272a] hover:scale-105"
                    }
                  `}
                  onClick={() => handleSelectRole(role)}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-[#72767d]"
                    style={{ background: role.color }}
                  />
                  <span>{role.name}</span>
                  {role.is_self_assignable && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      ✋ Self-Assign
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Edit Role Panel */}
      {selectedRole && canManageRoles && (
        <div className="bg-[#2f3136] rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-[#ed4245]">Edit Role: {selectedRole.name}</h2>
            <span
              className={`text-xs px-2 py-1 rounded-full ${getRoleTypeBadgeColor(
                selectedRole.role_type
              )}`}
            >
              {getRoleTypeLabel(selectedRole.role_type)}
            </span>
          </div>

          {/* Role Name */}
          <label className="block font-semibold mb-2 text-[#b5bac1]">Role Name</label>
          <input
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-4 focus:border-[#b5bac1] focus:outline-none transition-all"
            value={selectedRole.name}
            onChange={(e) => handleEditRole("name", e.target.value)}
            disabled={selectedRole.role_type === "owner" || selectedRole.role_type === "admin"}
          />

          {/* Role Color */}
          <label className="block font-semibold mb-2 text-[#b5bac1]">Role Color</label>
          <input
            className="w-10 h-10 rounded border-2 border-[#72767d] mb-4 cursor-pointer"
            type="color"
            value={selectedRole.color}
            onChange={(e) => handleEditRole("color", e.target.value)}
          />

          {/* Self-Assignable Toggle */}
          {selectedRole.role_type !== "owner" && selectedRole.role_type !== "admin" && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="selfAssignable"
                  className="w-5 h-5 accent-yellow-400"
                  checked={selectedRole.is_self_assignable}
                  onChange={(e) => handleEditRole("is_self_assignable", e.target.checked)}
                />
                <label htmlFor="selfAssignable" className="text-[#b5bac1]">
                  Allow members to self-assign this role
                </label>
              </div>

              {/* Category Selection */}
              <label className="block font-semibold mb-2 text-[#b5bac1]">Category</label>
              <select
                className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-4 focus:border-[#b5bac1] focus:outline-none"
                value={selectedRole.category_id || ""}
                onChange={(e) => handleEditRole("category_id", e.target.value || null)}
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <button
              className="bg-gradient-to-r from-[#ed4245] to-[#a32224] text-white font-bold rounded px-6 py-2 shadow transition hover:from-[#a32224] hover:to-[#ed4245] disabled:opacity-50"
              onClick={handleSaveRole}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="bg-[#23272a] text-gray-400 font-semibold rounded px-6 py-2 border-2 border-gray-600 transition hover:bg-gray-700"
              onClick={() => setSelectedRole(null)}
            >
              Cancel
            </button>
            {selectedRole.role_type !== "owner" &&
              (selectedRole.role_type !== "admin" || isOwner) && (
                <button
                  className="bg-[#23272a] text-[#ed4245] font-semibold rounded px-6 py-2 border-2 border-[#ed4245] transition hover:bg-[#ed4245] hover:text-white ml-auto"
                  onClick={() => handleDeleteRole(selectedRole.id)}
                  disabled={saving}
                >
                  Delete
                </button>
              )}
          </div>
        </div>
      )}

      {/* Create Role Popup */}
      {showAddPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
          <div className="bg-[#23272a] rounded-lg p-8 shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-[#b5bac1] hover:text-white text-2xl"
              onClick={() => setShowAddPopup(false)}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-6 text-white">Create New Role</h2>

            <label className="block font-semibold mb-2 text-[#b5bac1]">Role Name</label>
            <input
              className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-4 focus:border-[#b5bac1] focus:outline-none"
              type="text"
              placeholder="e.g., Gaming, Anime, Music"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            />

            <label className="block font-semibold mb-2 text-[#b5bac1]">Role Color</label>
            <input
              className="w-10 h-10 rounded border-2 border-[#72767d] mb-4 cursor-pointer"
              type="color"
              value={newRoleColor}
              onChange={(e) => setNewRoleColor(e.target.value)}
            />

            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="newSelfAssignable"
                className="w-5 h-5 accent-yellow-400"
                checked={newRoleSelfAssignable}
                onChange={(e) => setNewRoleSelfAssignable(e.target.checked)}
              />
              <label htmlFor="newSelfAssignable" className="text-[#b5bac1]">
                Self-Assignable (members can pick this role)
              </label>
            </div>

            <label className="block font-semibold mb-2 text-[#b5bac1]">Category (Optional)</label>
            <select
              className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-6 focus:border-[#b5bac1] focus:outline-none"
              value={newRoleCategory}
              onChange={(e) => setNewRoleCategory(e.target.value)}
            >
              <option value="">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <button
              className="w-full bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-6 py-3 shadow transition hover:from-[#ffcc33] hover:to-[#ffb347] disabled:opacity-50"
              onClick={handleAddRole}
              disabled={saving || !newRoleName.trim()}
            >
              {saving ? "Creating..." : "Create Role"}
            </button>
          </div>
        </div>
      )}

      {/* Create Category Popup */}
      {showCategoryPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
          <div className="bg-[#23272a] rounded-lg p-8 shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-[#b5bac1] hover:text-white text-2xl"
              onClick={() => setShowCategoryPopup(false)}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-6 text-white">Create Role Category</h2>
            <p className="text-gray-400 text-sm mb-4">
              Categories help organize self-assignable roles (e.g., "Interests", "Pronouns",
              "Region")
            </p>

            <label className="block font-semibold mb-2 text-[#b5bac1]">Category Name</label>
            <input
              className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-4 focus:border-[#b5bac1] focus:outline-none"
              type="text"
              placeholder="e.g., Interests, Pronouns, Region"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />

            <label className="block font-semibold mb-2 text-[#b5bac1]">
              Description (Optional)
            </label>
            <input
              className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-6 focus:border-[#b5bac1] focus:outline-none"
              type="text"
              placeholder="e.g., Pick your interests"
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
            />

            <button
              className="w-full bg-gradient-to-r from-[#5865f2] to-[#4752c4] text-white font-bold rounded px-6 py-3 shadow transition hover:from-[#4752c4] hover:to-[#5865f2] disabled:opacity-50"
              onClick={handleAddCategory}
              disabled={saving || !newCategoryName.trim()}
            >
              {saving ? "Creating..." : "Create Category"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
