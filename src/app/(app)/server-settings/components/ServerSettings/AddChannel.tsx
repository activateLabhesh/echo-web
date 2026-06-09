"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { createChannel, getAllRoles, setChannelRoleAccess } from "@/api";
import { ChannelData } from "@/api/types/channel.types";
import { Role } from "@/api/types/roles.types";
import { useSearchParams } from "next/navigation";

const AddChannel: React.FC = () => {
  const searchParams = useSearchParams();
  const serverId = searchParams.get("serverId");

  const [formData, setFormData] = useState<ChannelData>({
    name: "",
    type: "text",
    channel_type: "normal",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedModeratorIds, setSelectedModeratorIds] = useState<string[]>(
    []
  );
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Load roles when server ID is available
  useEffect(() => {
    const loadRoles = async () => {
      if (!serverId) return;
      setLoadingRoles(true);
      try {
        const serverRoles = await getAllRoles(serverId);
        // Filter out owner and admin roles - they can see all channels anyway
        const assignableRoles = serverRoles.filter(
          (r) => r.role_type !== "owner" && r.role_type !== "admin"
        );
        setRoles(assignableRoles);
      } catch (error) {
        console.error("Failed to load roles:", error);
      } finally {
        setLoadingRoles(false);
      }
    };
    loadRoles();
  }, [serverId]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;
    const { name, value, type } = target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (target as HTMLInputElement).checked : value,
    }));

    // Clear selected roles when switching channel types
    if (name === "channel_type") {
      setSelectedRoleIds([]);
      setSelectedModeratorIds([]);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleModeratorToggle = (roleId: string) => {
    setSelectedModeratorIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const validatePayload = (): string | null => {
    if (!serverId) return "Missing server ID in URL.";
    if (!formData.name || formData.name.trim().length < 1)
      return "Channel name cannot be empty.";
    if (!["text", "voice"].includes(formData.type))
      return "Invalid channel type.";
    if (
      !["normal", "read_only", "role_restricted"].includes(
        formData.channel_type || "normal"
      )
    )
      return "Invalid permission type.";
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const error = validatePayload();
    if (error) {
      setMessage(error);
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Prepare channel data with new permission system
      const channelPayload: ChannelData = {
        name: formData.name,
        type: formData.type,
        channel_type: formData.channel_type || "normal",
        allowed_role_ids:
          formData.channel_type === "role_restricted" ? selectedRoleIds : [],
        moderator_role_ids:
          formData.channel_type === "read_only" ||
          formData.channel_type === "role_restricted"
            ? selectedModeratorIds
            : [],
      };

      const response = await createChannel(serverId!, channelPayload);

      setMessage("✓ Channel created successfully!");
      setMessageType("success");
      setFormData({ name: "", type: "text", channel_type: "normal" });
      setSelectedRoleIds([]);
      setSelectedModeratorIds([]);

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      console.error("Error creating channel:", err);
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create channel.";
      setMessage(errMsg);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 text-white">
      <h1 className="text-2xl font-bold mb-8">Create Channel</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Channel Name */}
        <div>
          <label className="block font-semibold mb-2 text-[#b5bac1]">
            Channel Name
          </label>
          <input
            type="text"
            name="name"
            placeholder="Enter channel name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 focus:border-[#FFC341] focus:outline-none transition-all duration-200 transform hover:-translate-y-1 focus:-translate-y-1"
          />
        </div>

        {/* Channel Type */}
        <div>
          <label className="block font-semibold mb-2 text-[#b5bac1]">
            Channel Type
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 focus:border-[#FFC341] focus:outline-none transition-all duration-200 cursor-pointer"
          >
            <option value="text">Text</option>
            <option value="voice">Voice</option>
          </select>
        </div>

        {/* Permission Type */}
        <div>
          <label className="block font-semibold mb-2 text-[#b5bac1]">
            Permission Type
          </label>
          <select
            name="channel_type"
            value={formData.channel_type}
            onChange={handleChange}
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 focus:border-[#FFC341] focus:outline-none transition-all duration-200 cursor-pointer"
          >
            <option value="normal">Normal - Everyone can view and send</option>
            <option value="read_only">
              Read Only - Everyone views, only admins/mods send
            </option>
            <option value="role_restricted">
              Role Restricted - Specific roles only
            </option>
          </select>

          {/* Info text based on selection */}
          <div className="mt-3 p-3 bg-[#2f3136] rounded-lg border-l-4 border-[#FFC341]">
            {formData.channel_type === "normal" && (
              <p className="text-sm text-[#b5bac1]">
                📝 All members can view and send messages
              </p>
            )}
            {formData.channel_type === "read_only" && (
              <p className="text-sm text-[#b5bac1]">
                🔒 Perfect for announcements - all members can see messages, but
                only admins and selected moderators can send
              </p>
            )}
            {formData.channel_type === "role_restricted" && (
              <p className="text-sm text-[#b5bac1]">
                👥 Only members with selected roles can view this channel.
                Admins and moderators can send messages
              </p>
            )}
          </div>
        </div>

        {/* Role selection for role_restricted channels */}
        {formData.channel_type === "role_restricted" && (
          <div className="p-4 bg-[#2f3136] rounded-lg border-2 border-[#72767d]">
            <label className="block font-semibold mb-2 text-[#b5bac1]">
              Who can view this channel?
            </label>
            <p className="text-sm text-[#72767d] mb-3">
              Select roles that can access this channel. Owners and Admins can
              always see all channels.
            </p>
            {loadingRoles ? (
              <div className="text-[#72767d]">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="text-[#72767d] text-sm">
                No custom roles available. Create roles first in the Roles
                settings.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-[#72767d] scrollbar-track-[#2f3136]">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-[#36393f] cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="h-4 w-4 accent-[#FFC341] border-[#72767d] rounded"
                    />
                    <span
                      className="px-2 py-1 rounded text-sm font-medium text-white"
                      style={{ backgroundColor: role.color || "#5865f2" }}
                    >
                      {role.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedRoleIds.length > 0 && (
              <div className="mt-3 text-sm text-[#FFC341] font-medium">
                ✓ {selectedRoleIds.length} role(s) can view this channel
              </div>
            )}
          </div>
        )}

        {/* Moderator selection for read_only and role_restricted channels */}
        {(formData.channel_type === "read_only" ||
          formData.channel_type === "role_restricted") && (
          <div className="p-4 bg-[#2f3136] rounded-lg border-2 border-[#FFC341]">
            <label className="block font-semibold mb-2 text-[#b5bac1]">
              Who can send messages? (Optional)
            </label>
            <p className="text-sm text-[#72767d] mb-3">
              Admins and owners can always send. Select additional moderator
              roles below.
            </p>
            {loadingRoles ? (
              <div className="text-[#72767d]">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="text-[#72767d] text-sm">
                No custom roles available.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-[#72767d] scrollbar-track-[#2f3136]">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-[#36393f] cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModeratorIds.includes(role.id)}
                      onChange={() => handleModeratorToggle(role.id)}
                      className="h-4 w-4 accent-[#FFC341] border-[#72767d] rounded"
                    />
                    <span
                      className="px-2 py-1 rounded text-sm font-medium text-white"
                      style={{ backgroundColor: role.color || "#5865f2" }}
                    >
                      {role.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedModeratorIds.length > 0 && (
              <div className="mt-3 text-sm text-[#FFC341] font-medium">
                ✓ {selectedModeratorIds.length} moderator role(s) can send
                messages
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-bold rounded px-6 py-3 shadow transition-all duration-200
            hover:from-[#FFD700] hover:to-[#FFC341] hover:-translate-y-1 hover:scale-105 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          style={{
            backgroundSize: "200% 200%",
            backgroundPosition: "left center",
            transition: "background-position 0.5s, transform 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundPosition = "right center")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundPosition = "left center")
          }
        >
          {loading ? "Creating..." : "Create Channel"}
        </button>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-center font-medium ${
              messageType === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </div>
  );
};

export default AddChannel;
