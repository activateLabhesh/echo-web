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
    is_private: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
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
          (r) => r.role_type !== 'owner' && r.role_type !== 'admin'
        );
        setRoles(assignableRoles);
      } catch (error) {
        console.error('Failed to load roles:', error);
      } finally {
        setLoadingRoles(false);
      }
    };
    loadRoles();
  }, [serverId]);

 const handleChange = (
   e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
 ) => {
   const target = e.target;
   const { name, value, type } = target;

   setFormData((prev) => ({
     ...prev,
     [name]: type === "checkbox" ? (target as HTMLInputElement).checked : value,
   }));

   // Clear selected roles if unchecking private
   if (name === 'is_private' && !(target as HTMLInputElement).checked) {
     setSelectedRoleIds([]);
   }
 };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
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
    return null;
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const error = validatePayload();
    if (error) {
      setMessage(error);
      return;
    }

    setLoading(true);
    setMessage("");

    try {

      const response = await createChannel(serverId!, formData);


      // If private channel with selected roles, set the role access
      if (formData.is_private && selectedRoleIds.length > 0 && response?.id) {
        await setChannelRoleAccess(response.id, {
          isPrivate: true,
          roleIds: selectedRoleIds,
        });
      }

      setMessage(" Channel created successfully!");
      setFormData({ name: "", type: "text", is_private: false });
      setSelectedRoleIds([]);
    } catch (err: any) {
      console.error("Error creating channel:", err);

    
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        " Failed to create channel.";
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center px-6 py-10">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Create Channel
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Channel Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="Enter channel name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-indigo-400 outline-none"
            />
          </div>

         
          <div className="mt-4">
            <label className="block text-gray-700 font-semibold mb-1">
              Channel Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-indigo-400 outline-none"
            >
              <option value="text">Text</option>
              <option value="voice">Voice</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="is_private"
              checked={formData.is_private}
              onChange={handleChange}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-400 border-gray-300 rounded"
            />
            <label className="text-gray-700 font-medium">Private Channel</label>
          </div>

          {/* Role selection for private channels */}
          {formData.is_private && (
            <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
              <label className="block text-gray-700 font-semibold mb-2">
                Select roles that can access this channel
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Owners and Admins can always see private channels. Select additional roles below.
              </p>
              {loadingRoles ? (
                <div className="text-gray-500">Loading roles...</div>
              ) : roles.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  No custom roles available. Create roles first in the Roles settings.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-400 border-gray-300 rounded"
                      />
                      <span
                        className="px-2 py-1 rounded text-sm font-medium text-white"
                        style={{ backgroundColor: role.color || '#5865f2' }}
                      >
                        {role.name}
                      </span>
                      {role.is_self_assignable && (
                        <span className="text-xs text-gray-400">(Self-assignable)</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              {selectedRoleIds.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {selectedRoleIds.length} role(s) selected
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? "Creating..." : "Create Channel"}
          </button>

          {message && (
            <p className="text-center text-sm font-medium mt-3 text-gray-800">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddChannel;
