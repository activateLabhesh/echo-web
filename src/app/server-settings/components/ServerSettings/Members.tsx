import { useState, useEffect } from "react";
import { getServerMembers, kickMember, banMember, addUserToServer, searchUsers, ServerMember, SearchUser, getAllRoles, assignRoleToUser, removeRoleFromUser, Role } from "../../../api";

interface Member {
  id: string;
  username: string;
  fullname: string;
  roles: { id: string; name: string; color: string; role_type: string }[];
  joinDate: string;
  avatar: string;
}

interface MembersProps {
  serverId: string;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export default function Members({ serverId, isOwner = false, isAdmin = false }: MembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showRolePopupFor, setShowRolePopupFor] = useState<string | null>(null);
  const [serverRoles, setServerRoles] = useState<Role[]>([]);
  const [roleActionLoading, setRoleActionLoading] = useState<string | null>(null);
  const [addMemberError, setAddMemberError] = useState<string>("");
  const [addMemberSuccess, setAddMemberSuccess] = useState<string>("");

  useEffect(() => {
    loadMembers();
    loadServerRoles();
  }, [serverId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadServerRoles = async () => {
    try {
      const roles = await getAllRoles(serverId);
      setServerRoles(roles);
    } catch (error) {
      console.error('Failed to load server roles:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const serverMembers = await getServerMembers(serverId);
      
      if (!serverMembers || !Array.isArray(serverMembers)) {
        setMembers([]);
        return;
      }
      
      const formattedMembers: Member[] = serverMembers.map((member: ServerMember) => {
        return {
          id: member.user_id,
          username: `@${member.users.username}`,
          fullname: member.users.fullname,
          roles: member.user_roles?.map((ur: any) => ({
            id: ur.roles?.id || ur.role_id,
            name: ur.roles?.name || 'Unknown',
            color: ur.roles?.color || '#5865f2',
            role_type: ur.roles?.role_type || 'custom'
          })) || [],
          joinDate: new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          avatar: member.users.avatar_url || "/avatar.png",
        };
      });
      
      setMembers(formattedMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (memberId: string, roleId: string) => {
    setRoleActionLoading(roleId);
    try {
      await assignRoleToUser(serverId, memberId, roleId);
      await loadMembers(); // Refresh member list
    } catch (error: any) {
      console.error('Failed to assign role:', error);
      alert(error?.response?.data?.error || 'Failed to assign role');
    } finally {
      setRoleActionLoading(null);
    }
  };

  const handleRemoveRole = async (memberId: string, roleId: string) => {
    setRoleActionLoading(roleId);
    try {
      await removeRoleFromUser(serverId, memberId, roleId);
      await loadMembers(); // Refresh member list
    } catch (error: any) {
      console.error('Failed to remove role:', error);
      alert(error?.response?.data?.error || 'Failed to remove role');
    } finally {
      setRoleActionLoading(null);
    }
  };

  const handleSearchUsers = async () => {
    setSearchLoading(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKickMember = async (memberId: string, memberUsername: string) => {
    if (!confirm(`Are you sure you want to kick ${memberUsername}?`)) return;
    
    try {
      await kickMember(serverId, memberId);
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (error) {
      console.error('Failed to kick member:', error);
      alert('Failed to kick member. Please try again.');
    }
  };

  const handleBanMember = async (memberId: string, memberUsername: string) => {
    const reason = prompt(`Ban reason for ${memberUsername}:`);
    if (reason === null) return; // User cancelled
    
    try {
      await banMember(serverId, memberId, reason);
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (error) {
      console.error('Failed to ban member:', error);
      alert('Failed to ban member. Please try again.');
    }
  };

  const handleAddMemberToServer = async (user: SearchUser) => {
    try {
      setAddMemberError("");
      setAddMemberSuccess("");
      await addUserToServer(serverId, user.username);
      setShowAddMember(false);
      setSearchQuery("");
      setSearchResults([]);
      setAddMemberSuccess(`Successfully added @${user.username} to the server!`);
      await loadMembers(); // Refresh the member list
      
      // Clear success message after 3 seconds
      setTimeout(() => setAddMemberSuccess(""), 3000);
    } catch (error: any) {
      console.error('Failed to add member:', error);
      
      // Check for specific error messages from backend
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to add member. Please try again.';
      
      // Customize message for banned user
      if (errorMessage.includes('banned') || errorMessage.includes('ban')) {
        setAddMemberError(`Cannot add @${user.username}: This user is banned from the server. You need to unban them first from the Bans section.`);
      } else if (errorMessage.includes('already a member')) {
        setAddMemberError(`@${user.username} is already a member of this server.`);
      } else {
        setAddMemberError(`Failed to add @${user.username}: ${errorMessage}`);
      }
      
      // Clear error message after 5 seconds
      setTimeout(() => setAddMemberError(""), 5000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-white">
        <div className="text-center">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <div className="text-sm text-gray-400 mt-1">
            Server ID: {serverId} | Members found: {members.length}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadMembers}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh
          </button>
          {(isOwner || isAdmin) && (
            <button
              onClick={() => {
                setShowAddMember(!showAddMember);
                setAddMemberError("");
                setAddMemberSuccess("");
              }}
              className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-4 py-2 shadow transition-all duration-200 hover:from-[#ffcc33] hover:to-[#ffb347] hover:-translate-y-1 hover:scale-105"
            >
              {showAddMember ? "Cancel" : "Add Member"}
            </button>
          )}
        </div>
      </div>

      {/* Error and Success Messages */}
      {addMemberError && (
        <div className="mb-4 bg-red-500 border border-red-600 text-white px-4 py-3 rounded flex items-start">
          <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">{addMemberError}</div>
        </div>
      )}
      
      {addMemberSuccess && (
        <div className="mb-4 bg-green-500 border border-green-600 text-white px-4 py-3 rounded flex items-start">
          <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">{addMemberSuccess}</div>
        </div>
      )}

      {showAddMember && (
        <div className="mb-6 p-4 border border-[#72767d] rounded">
          <h3 className="text-lg font-semibold mb-3">Add New Member</h3>
          <div className="flex gap-3 mb-3">
            <input
              className="flex-1 bg-black text-white border-2 border-[#72767d] rounded px-4 py-2 focus:border-[#b5bac1] focus:outline-none"
              placeholder="Search users by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {searchLoading && (
            <div className="text-[#b5bac1] text-sm">Searching...</div>
          )}
          
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 border border-[#72767d] rounded">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar_url || "/avatar.png"}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div className="font-medium">@{user.username}</div>
                      <div className="text-sm text-[#b5bac1]">{user.fullname}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddMemberToServer(user)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-center p-8 border border-[#72767d] rounded">
          <div className="text-[#b5bac1] text-lg mb-2">No members found</div>
          <div className="text-[#72767d] text-sm">
            This server doesn't have any members yet, or there was an issue loading them.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 border border-[#72767d] rounded hover:border-[#b5bac1] transition"
          >
            <div className="flex items-center gap-4">
              <img
                src={member.avatar}
                alt={member.username}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <div className="font-semibold">{member.username}</div>
                <div className="text-sm text-[#b5bac1]">{member.fullname}</div>
                <div className="text-xs text-[#72767d]">Joined {member.joinDate}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {member.roles.map((role) => (
                    <span
                      key={role.id}
                      className="text-xs px-2 py-1 rounded text-white"
                      style={{ backgroundColor: role.color || "#5865f2" }}
                    >
                      {role.name}
                      {role.role_type === 'owner' && ' 👑'}
                      {role.role_type === 'admin' && ' ⭐'}
                    </span>
                  ))}
                  {member.roles.length === 0 && (
                    <span className="text-xs text-[#72767d]">No roles</span>
                  )}
                </div>
              </div>
            </div>
            {(isOwner || isAdmin) && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRolePopupFor(showRolePopupFor === member.id ? null : member.id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Manage Roles
                </button>
                <button
                  onClick={() => handleKickMember(member.id, member.username)}
                  className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                >
                  Kick
                </button>
                <button
                  onClick={() => handleBanMember(member.id, member.username)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Ban
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {showRolePopupFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2f3136] p-6 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Manage Roles</h3>
            <p className="text-sm text-[#b5bac1] mb-4">
              for {members.find(m => m.id === showRolePopupFor)?.username}
            </p>
            
            {/* Current roles */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-[#b5bac1] mb-2">Current Roles</h4>
              <div className="flex flex-wrap gap-2">
                {members.find(m => m.id === showRolePopupFor)?.roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center gap-1 px-2 py-1 rounded text-sm"
                    style={{ backgroundColor: role.color || '#5865f2' }}
                  >
                    <span>{role.name}</span>
                    {role.role_type !== 'owner' && (
                      <button
                        onClick={() => handleRemoveRole(showRolePopupFor!, role.id)}
                        disabled={roleActionLoading === role.id}
                        className="ml-1 hover:text-red-300"
                      >
                        {roleActionLoading === role.id ? '...' : '×'}
                      </button>
                    )}
                  </div>
                ))}
                {members.find(m => m.id === showRolePopupFor)?.roles.length === 0 && (
                  <span className="text-sm text-[#72767d]">No roles assigned</span>
                )}
              </div>
            </div>

            {/* Available roles to assign */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-[#b5bac1] mb-2">Available Roles</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {serverRoles
                  .filter(role => {
                    // Filter out roles the member already has
                    const memberRoles = members.find(m => m.id === showRolePopupFor)?.roles || [];
                    return !memberRoles.some(mr => mr.id === role.id);
                  })
                  .filter(role => {
                    // NEVER allow assigning owner role - there can only be one owner
                    if (role.role_type === 'owner') {
                      return false;
                    }
                    // Only owner can assign admin roles
                    if (role.role_type === 'admin') {
                      return isOwner;
                    }
                    return true;
                  })
                  .map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleAssignRole(showRolePopupFor!, role.id)}
                      disabled={roleActionLoading === role.id}
                      className="flex items-center justify-between w-full text-left p-2 rounded hover:bg-[#40444b] transition"
                    >
                      <span style={{ color: role.color || '#fff' }}>
                        {role.name}
                        {role.role_type === 'admin' && ' (Admin)'}
                        {role.is_self_assignable && ' (Self-assignable)'}
                      </span>
                      <span className="text-xs text-[#b5bac1]">
                        {roleActionLoading === role.id ? 'Adding...' : '+ Add'}
                      </span>
                    </button>
                  ))
                }
                {serverRoles.filter(role => {
                  const memberRoles = members.find(m => m.id === showRolePopupFor)?.roles || [];
                  return !memberRoles.some(mr => mr.id === role.id);
                }).length === 0 && (
                  <span className="text-sm text-[#72767d]">No more roles available</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowRolePopupFor(null)}
              className="w-full bg-[#72767d] text-white px-4 py-2 rounded hover:bg-[#5d6269]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
