import { useState, useEffect } from "react";
import { getServerMembers, kickMember, banMember, addUserToServer, searchUsers, ServerMember, SearchUser } from "../../../api";

interface Member {
  id: string;
  username: string;
  fullname: string;
  roles: string[];
  joinDate: string;
  avatar: string;
}

interface MembersProps {
  serverId: string;
}

const availableRoles = [
  { id: 1, name: "Admin", color: "#ed4245" },
  { id: 2, name: "Moderator", color: "#5865f2" },
  { id: 3, name: "Member", color: "#43b581" },
];

export default function Members({ serverId }: MembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showRolePopupFor, setShowRolePopupFor] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
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
          roles: member.user_roles?.map(ur => ur.roles.name) || [],
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
      await addUserToServer(serverId, user.username);
      setShowAddMember(false);
      setSearchQuery("");
      setSearchResults([]);
      await loadMembers(); // Refresh the member list
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member. Please try again.');
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
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-4 py-2 shadow transition-all duration-200 hover:from-[#ffcc33] hover:to-[#ffb347] hover:-translate-y-1 hover:scale-105"
          >
            {showAddMember ? "Cancel" : "Add Member"}
          </button>
        </div>
      </div>

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
                <div className="flex gap-1 mt-1">
                  {member.roles.map((role) => {
                    const roleConfig = availableRoles.find(r => r.name === role);
                    return (
                      <span
                        key={role}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: roleConfig?.color || "#43b581" }}
                      >
                        {role}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
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
          </div>
        ))}
      </div>
      )}

      {showRolePopupFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2f3136] p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Manage Roles</h3>
            <div className="space-y-2 mb-4">
              {availableRoles.map((role) => (
                <button
                  key={role.id}
                  className="block w-full text-left p-2 rounded hover:bg-[#72767d]"
                  style={{ color: role.color }}
                >
                  {role.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRolePopupFor(null)}
              className="bg-[#72767d] text-white px-4 py-2 rounded hover:bg-[#b5bac1]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
