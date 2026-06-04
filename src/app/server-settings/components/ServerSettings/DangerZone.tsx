"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteServer, transferServerOwnership, getServerMembers } from "@/api";
import { getUser } from "@/api";
import Toast from "@/components/Toast";

interface DangerZoneProps {
  serverId: string;
  serverName: string;
  isOwner: boolean;
}

interface Member {
  id: string;
  username: string;
  displayName?: string;
  avatar_url?: string;
}

export default function DangerZone({
  serverId,
  serverName,
  isOwner,
}: DangerZoneProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "info" | "success" | "error";
  } | null>(null);

  if (!isOwner) {
    return (
      <div className="bg-[#2f3136] rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">Danger Zone</h3>
        <p className="text-gray-400 text-sm">
          Only the server owner can access these settings.
        </p>
      </div>
    );
  }

  /* ---------------- DELETE SERVER ---------------- */

  const handleDeleteServer = async () => {
    if (deleteConfirmText !== serverName) return;

    try {
      setLoading(true);
      setToast({ message: "Deleting server…", type: "info" });

      await deleteServer(serverId);

      setToast({
        message: "Server deleted successfully",
        type: "success",
      });

      setTimeout(() => router.push("/servers"), 800);
    } catch (error: any) {
      console.error("Error deleting server:", error);
      setToast({
        message: error?.message || "Failed to delete server",
        type: "error",
      });
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    }
  };

  /* ---------------- LOAD MEMBERS ---------------- */

  const loadMembers = async () => {
    try {
      setMembersLoading(true);

      const [response, currentUser] = await Promise.all([
        getServerMembers(serverId),
        getUser(),
      ]);

      const allMembers = Array.isArray(response)
        ? response
        : response?.members || response?.data || [];

      const processedMembers = allMembers
        .map((member: any) => ({
          id: member.users?.id || member.user_id,
          username: member.users?.username || member.username,
          displayName:
            member.users?.fullname || member.fullname || member.displayName,
          avatar_url: member.users?.avatar_url || member.avatar_url,
        }))
        .filter((member: any) => member.id && member.id !== currentUser?.id);

      setMembers(processedMembers);
    } catch (error) {
      console.error("Error loading members:", error);
      setToast({
        message: "Failed to load server members",
        type: "error",
      });
    } finally {
      setMembersLoading(false);
    }
  };

  /* ---------------- TRANSFER OWNERSHIP ---------------- */

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) return;

    try {
      setLoading(true);
      setToast({ message: "Transferring ownership…", type: "info" });

      await transferServerOwnership(serverId, selectedNewOwner);

      setToast({
        message: "Ownership transferred successfully",
        type: "success",
      });

      setTimeout(() => router.push("/servers"), 800);
    } catch (error: any) {
      console.error("Error transferring ownership:", error);
      setToast({
        message: error?.message || "Failed to transfer ownership",
        type: "error",
      });
    } finally {
      setLoading(false);
      setShowTransferModal(false);
    }
  };

  const openTransferModal = () => {
    setShowTransferModal(true);
    loadMembers();
  };

  return (
    <div className="space-y-6 relative">
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

      {/* Main Card */}
      <div className="bg-[#2f3136] rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Danger Zone</h3>

        {/* Transfer Ownership */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-white mb-2">
            Transfer Ownership
          </h4>
          <p className="text-gray-400 text-sm mb-4">
            Transfer server ownership to another member. You will lose all
            administrative privileges.
          </p>
          <button
            onClick={openTransferModal}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md font-medium transition-colors"
          >
            Transfer Ownership
          </button>
        </div>

        {/* Delete Server */}
        <div>
          <h4 className="text-md font-medium text-white mb-2">Delete Server</h4>
          <p className="text-gray-400 text-sm mb-4">
            Permanently delete this server and all its data. This action cannot
            be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
          >
            Delete Server
          </button>
        </div>
      </div>

      {/* ================= TRANSFER MODAL ================= */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#36393f] rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">
              Transfer Ownership
            </h3>

            {membersLoading ? (
              <p className="text-gray-400 text-center py-6">Loading members…</p>
            ) : (
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-gray-400 text-center">
                    No other members available
                  </p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => setSelectedNewOwner(member.id)}
                      className={`flex items-center p-3 rounded-md cursor-pointer transition ${
                        selectedNewOwner === member.id
                          ? "bg-blue-600"
                          : "bg-[#2f3136] hover:bg-[#404249]"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center mr-3">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          member.username[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {member.displayName || member.username}
                        </p>
                        <p className="text-gray-400 text-sm">
                          @{member.username}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferOwnership}
                disabled={!selectedNewOwner || loading}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 py-2 rounded disabled:bg-gray-600"
              >
                {loading ? "Transferring…" : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE MODAL ================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#36393f] rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">
              Delete Server
            </h3>

            <p className="text-gray-400 text-sm mb-4">
              Type <strong className="text-white">{serverName}</strong> to
              confirm.
            </p>

            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full mb-6 px-3 py-2 bg-[#2f3136] border border-gray-600 rounded"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteServer}
                disabled={deleteConfirmText !== serverName || loading}
                className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded disabled:bg-gray-600"
              >
                {loading ? "Deleting…" : "Delete Server"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
