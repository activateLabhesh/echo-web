"use client";

import { useState, useEffect } from "react";
import { getBannedUsers, unbanUser } from "@/api";
import { BannedUser } from "@/api/types/user.types";
import Toast from "@/components/Toast";

interface BannedUsersProps {
  serverId: string;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export default function BannedUsers({
  serverId,
  isOwner = false,
  isAdmin = false,
}: BannedUsersProps) {
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);

  useEffect(() => {
    loadBannedUsers();
  }, [serverId]);

  const loadBannedUsers = async () => {
    try {
      setLoading(true);
      setToast({ message: "Loading banned users…", type: "info" });

      const banned = await getBannedUsers(serverId);
      setBannedUsers(banned);

      setToast(null);
    } catch (err: any) {
      console.error("Failed to load banned users:", err);
      setToast({
        message: err?.response?.data?.error || "Failed to load banned users",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to unban ${username}?`)) return;

    try {
      setToast({ message: `Unbanning ${username}…`, type: "info" });

      await unbanUser(serverId, userId);
      setBannedUsers((prev) => prev.filter((u) => u.user_id !== userId));

      setToast({
        message: `${username} has been unbanned`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Failed to unban user:", err);
      setToast({
        message:
          err?.response?.data?.error ||
          "Failed to unban user. Please try again.",
        type: "error",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 text-white relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999]">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={3000}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Banned Users</h1>
          <div className="text-sm text-gray-400 mt-1">
            Total banned: {bannedUsers.length}
          </div>
        </div>

        <button
          onClick={loadBannedUsers}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-gray-400">Loading banned users…</div>
      ) : bannedUsers.length === 0 ? (
        <div className="text-center p-8 border border-[#72767d] rounded">
          <div className="text-[#b5bac1] text-lg mb-2">No banned users</div>
          <div className="text-[#72767d] text-sm">
            This server has no banned users.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bannedUsers.map((banned) => (
            <div
              key={banned.user_id}
              className="flex items-center justify-between p-4 border border-red-900/30 rounded bg-red-950/10 hover:border-red-800/50 transition"
            >
              <div className="flex items-center gap-4 flex-1">
                <img
                  src={banned.users?.avatar_url || "/avatar.png"}
                  alt={banned.users?.username || "Unknown"}
                  className="w-12 h-12 rounded-full object-cover"
                />

                <div className="flex-1">
                  <div className="font-semibold">
                    @{banned.users?.username || "Unknown User"}
                  </div>
                  <div className="text-sm text-[#b5bac1]">
                    {banned.users?.fullname}
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-gray-400">
                    <div>
                      <span className="font-medium">Banned by:</span>{" "}
                      <span className="text-red-400">
                        @{banned.banned_by_user?.username || "Unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Date:</span>{" "}
                      {new Date(banned.banned_at).toLocaleString()}
                    </div>
                    {banned.reason && (
                      <div>
                        <span className="font-medium">Reason:</span>{" "}
                        <span className="text-red-300">{banned.reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(isOwner || isAdmin) && (
                <button
                  onClick={() =>
                    handleUnban(
                      banned.user_id,
                      banned.users?.username || "this user"
                    )
                  }
                  className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2 rounded font-medium hover:from-green-500 hover:to-green-400 transition"
                >
                  Unban
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 border border-yellow-900/30 rounded bg-yellow-950/10">
        <div className="flex items-start gap-2">
          <span className="text-yellow-500 text-lg">⚠️</span>
          <div className="text-sm text-gray-300">
            <p className="font-medium text-yellow-400 mb-1">About Bans</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Banned users cannot join via invite links</li>
              <li>Only owners and admins can unban users</li>
              <li>Unbanning allows users to rejoin the server</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
