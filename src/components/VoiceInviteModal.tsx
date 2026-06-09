"use client";

// src/components/VoiceInviteModal.tsx
// Modal for inviting people to a voice channel
// Has two tabs: "In Call" (current participants) and "Server Members" (all server members with voice status)

import React, { useEffect, useState } from "react";
import {
  X,
  Phone,
  Mic,
  MicOff,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
// TODO: These imports need to be implemented
// import { getServerMembersWithVoicePresence, MemberWithVoicePresence } from '@/app/api';
// import { VoiceParticipant } from '@/context/VoiceContext';
import { Socket } from "socket.io-client";

// Temporary type definitions until proper imports are available
interface MemberWithVoicePresence {
  user_id: string;
  username: string;
  fullname: string;
  avatar_url?: string | null;
  status: "online" | "offline" | "idle" | "dnd";
  voice_channel?: {
    channel_id: string;
    channel_name: string;
  } | null;
}

interface VoiceParticipant {
  attendeeId: string;
  oduserId: string;
  odusername?: string;
  muted: boolean;
  speaking: boolean;
  isLocal?: boolean;
}

// Temporary stub function
const getServerMembersWithVoicePresence = async (
  serverId: string
): Promise<MemberWithVoicePresence[]> => {
  console.warn("getServerMembersWithVoicePresence not implemented");
  return [];
};

// ==================== TYPES ====================

interface VoiceInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  serverId: string;
  serverName: string;
  currentUserId: string;
  currentUsername: string;
  currentUserAvatar?: string;
  participants: VoiceParticipant[]; // Current voice channel participants
  socket: Socket | null;
}

type TabType = "in-call" | "server-members";

// ==================== COMPONENT ====================

const VoiceInviteModal: React.FC<VoiceInviteModalProps> = ({
  isOpen,
  onClose,
  channelId,
  channelName,
  serverId,
  serverName,
  currentUserId,
  currentUsername,
  currentUserAvatar,
  participants,
  socket,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("in-call");
  const [serverMembers, setServerMembers] = useState<MemberWithVoicePresence[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteSentTo, setInviteSentTo] = useState<Set<string>>(new Set());
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Fetch server members with voice presence when modal opens or tab changes
  useEffect(() => {
    if (isOpen && activeTab === "server-members" && serverId) {
      fetchServerMembers();
    }
  }, [isOpen, activeTab, serverId]);

  // Listen for invite responses
  useEffect(() => {
    if (!socket) return;

    const handleInviteSent = (data: {
      targetUserId: string;
      success: boolean;
    }) => {
      if (data.success) {
        setInviteSentTo((prev) => new Set(prev).add(data.targetUserId));
        // Clear after 5 seconds
        setTimeout(() => {
          setInviteSentTo((prev) => {
            const next = new Set(prev);
            next.delete(data.targetUserId);
            return next;
          });
        }, 5000);
      }
    };

    const handleInviteError = (data: {
      message: string;
      targetUserId?: string;
    }) => {
      setInviteError(data.message);
      setTimeout(() => setInviteError(null), 3000);
    };

    socket.on("voice_invite_sent", handleInviteSent);
    socket.on("voice_invite_error", handleInviteError);

    return () => {
      socket.off("voice_invite_sent", handleInviteSent);
      socket.off("voice_invite_error", handleInviteError);
    };
  }, [socket]);

  const fetchServerMembers = async () => {
    setIsLoading(true);
    try {
      const members = await getServerMembersWithVoicePresence(serverId);
      setServerMembers(members);
    } catch (error) {
      console.error("Failed to fetch server members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = (targetUserId: string, targetUsername: string) => {
    if (!socket) {
      setInviteError("Not connected to server");
      return;
    }

    // Don't send invite to self or already in call
    if (targetUserId === currentUserId) return;

    // Check if already in this voice channel
    const alreadyInCall = participants.some(
      (p) =>
        p.oduserId === targetUserId ||
        p.oduserId === targetUsername
    );
    if (alreadyInCall) return;

    socket.emit("send_voice_invite", {
      targetUserId,
      channelId,
      channelName,
      serverId,
      serverName,
      inviterUserId: currentUserId,
      inviterUsername: currentUsername,
      inviterAvatar: currentUserAvatar,
    });
  };

  // Filter server members based on search query
  const filteredMembers = serverMembers.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.username.toLowerCase().includes(query) ||
      member.fullname.toLowerCase().includes(query)
    );
  });

  // Separate members into groups: in this call, in other calls, not in call
  const membersInThisCall = filteredMembers.filter(
    (m) => m.voice_channel?.channel_id === channelId
  );
  const membersInOtherCalls = filteredMembers.filter(
    (m) => m.voice_channel && m.voice_channel.channel_id !== channelId
  );
  const membersNotInCall = filteredMembers.filter((m) => !m.voice_channel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#2b2d31] rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Invite to Voice
            </h2>
            <p className="text-sm text-gray-400">{channelName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("in-call")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "in-call"
                ? "text-white border-b-2 border-indigo-500"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              In Call ({participants.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab("server-members")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "server-members"
                ? "text-white border-b-2 border-indigo-500"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              Server Members
            </div>
          </button>
        </div>

        {/* Error message */}
        {inviteError && (
          <div className="mx-4 mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
            {inviteError}
          </div>
        )}

        {/* Search (only for server members tab) */}
        {activeTab === "server-members" && (
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1e1f22] rounded-md">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 pt-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {activeTab === "in-call" ? (
            // In Call Tab - Show current participants
            <div className="space-y-2">
              {participants.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">
                  No one else is in the call yet
                </p>
              ) : (
                participants.map((participant) => (
                  <MemberItem
                    key={participant.attendeeId}
                    userId={participant.oduserId}
                    username={
                      participant.odusername ||
                      `User ${participant.oduserId?.substring(0, 8)}`
                    }
                    avatarUrl={undefined}
                    status="online"
                    voiceStatus="in-this-call"
                    voiceChannelName={channelName}
                    isMuted={participant.muted}
                    isSpeaking={participant.speaking}
                    isCurrentUser={participant.isLocal}
                    canInvite={false}
                    onInvite={() => {}}
                  />
                ))
              )}
            </div>
          ) : (
            // Server Members Tab
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Members in this call */}
                  {membersInThisCall.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                        In This Call - {membersInThisCall.length}
                      </h4>
                      <div className="space-y-1">
                        {membersInThisCall.map((member) => (
                          <MemberItem
                            key={member.user_id}
                            userId={member.user_id}
                            username={member.username}
                            fullname={member.fullname}
                            avatarUrl={member.avatar_url}
                            status={member.status}
                            voiceStatus="in-this-call"
                            voiceChannelName={channelName}
                            isCurrentUser={member.user_id === currentUserId}
                            canInvite={false}
                            onInvite={() => {}}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Members in other calls */}
                  {membersInOtherCalls.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                        In Other Calls - {membersInOtherCalls.length}
                      </h4>
                      <div className="space-y-1">
                        {membersInOtherCalls.map((member) => (
                          <MemberItem
                            key={member.user_id}
                            userId={member.user_id}
                            username={member.username}
                            fullname={member.fullname}
                            avatarUrl={member.avatar_url}
                            status={member.status}
                            voiceStatus="in-other-call"
                            voiceChannelName={
                              member.voice_channel?.channel_name
                            }
                            isCurrentUser={member.user_id === currentUserId}
                            canInvite={true}
                            inviteSent={inviteSentTo.has(member.user_id)}
                            onInvite={() =>
                              handleInvite(member.user_id, member.username)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Members not in any call */}
                  {membersNotInCall.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                        Available - {membersNotInCall.length}
                      </h4>
                      <div className="space-y-1">
                        {membersNotInCall.map((member) => (
                          <MemberItem
                            key={member.user_id}
                            userId={member.user_id}
                            username={member.username}
                            fullname={member.fullname}
                            avatarUrl={member.avatar_url}
                            status={member.status}
                            voiceStatus="not-in-call"
                            isCurrentUser={member.user_id === currentUserId}
                            canInvite={
                              member.status === "online" &&
                              member.user_id !== currentUserId
                            }
                            inviteSent={inviteSentTo.has(member.user_id)}
                            onInvite={() =>
                              handleInvite(member.user_id, member.username)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredMembers.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">
                      {searchQuery ? "No members found" : "No server members"}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== MEMBER ITEM COMPONENT ====================

interface MemberItemProps {
  userId: string;
  username: string;
  fullname?: string;
  avatarUrl?: string | null;
  status: "online" | "offline" | "idle" | "dnd";
  voiceStatus: "in-this-call" | "in-other-call" | "not-in-call";
  voiceChannelName?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  isCurrentUser?: boolean;
  canInvite: boolean;
  inviteSent?: boolean;
  onInvite: () => void;
}

const MemberItem: React.FC<MemberItemProps> = ({
  userId,
  username,
  fullname,
  avatarUrl,
  status,
  voiceStatus,
  voiceChannelName,
  isMuted,
  isSpeaking,
  isCurrentUser,
  canInvite,
  inviteSent,
  onInvite,
}) => {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-500",
    idle: "bg-yellow-500",
    dnd: "bg-red-500",
  };

  const getVoiceStatusText = () => {
    if (voiceStatus === "in-this-call") return "In this call";
    if (voiceStatus === "in-other-call")
      return `In ${voiceChannelName || "another call"}`;
    return status === "offline" ? "Offline" : "";
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-[#35373c] transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-[#5865f2] flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-medium">
                {(username || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {/* Status indicator */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#2b2d31] ${statusColors[status]}`}
          />
        </div>

        {/* Name and status */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white">
              {fullname || username}
              {isCurrentUser && (
                <span className="text-gray-400 ml-1">(You)</span>
              )}
            </span>
            {/* Voice status icons */}
            {voiceStatus === "in-this-call" && (
              <div className="flex items-center gap-1">
                {isMuted ? (
                  <MicOff className="w-3 h-3 text-red-400" />
                ) : isSpeaking ? (
                  <Mic className="w-3 h-3 text-green-400 animate-pulse" />
                ) : (
                  <Mic className="w-3 h-3 text-gray-400" />
                )}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {voiceStatus === "in-other-call" && (
              <Phone className="w-3 h-3 inline mr-1" />
            )}
            {getVoiceStatusText()}
          </span>
        </div>
      </div>

      {/* Invite button */}
      {canInvite && !isCurrentUser && (
        <button
          onClick={onInvite}
          disabled={inviteSent}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            inviteSent
              ? "bg-green-600 text-white cursor-default"
              : "bg-indigo-600 text-white hover:bg-indigo-500"
          }`}
        >
          {inviteSent ? "Sent!" : "Invite"}
        </button>
      )}

      {voiceStatus === "in-this-call" && !isCurrentUser && (
        <span className="text-xs text-green-400 flex items-center gap-1">
          <Phone className="w-3 h-3" />
          Connected
        </span>
      )}
    </div>
  );
};

export default VoiceInviteModal;
