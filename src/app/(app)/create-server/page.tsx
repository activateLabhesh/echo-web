"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createServer } from "@/app/api/API";

export default function CreateServerPage() {
  const router = useRouter();
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setServerIcon(file);
      setPreviewUrl(URL.createObjectURL(file)); 
    }
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!serverName.trim()) {
      setError("Please enter a server name.");
      return;
    }

    try {
      setLoading(true);
      const data = await createServer({
        name: serverName,
        icon: serverIcon || undefined,
      });
      setSuccess(`Server "${data.name}" created successfully!`);
      setTimeout(() => router.push("/servers?refresh=true"), 1500);
    } catch (err: any) {
      console.error(" Create server error:", err);
      setError(err.response?.data?.message || "Failed to create server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white items-center justify-center">
      <div className="w-full max-w-md p-8 bg-[#111214] rounded-2xl shadow-lg border border-gray-800">
        <h1 className="text-3xl font-bold mb-6 text-center text-green-400">
          Create a Server
        </h1>

        <form onSubmit={handleCreateServer} className="space-y-5">
          {/* Server Name Input */}
          <input
            type="text"
            placeholder="Enter server name"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            className="w-full p-3 bg-gray-800 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          {/* File Upload Section */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400 font-medium">
              Server Icon (optional)
            </label>

            <div className="flex items-center gap-3">
              {/* File Input */}
              <label
                htmlFor="fileUpload"
                className="cursor-pointer px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-all"
              >
                Choose File
              </label>
              <input
                id="fileUpload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {serverIcon && (
                <p className="text-sm text-gray-400 truncate w-40">
                  {serverIcon.name}
                </p>
              )}
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="mt-3 flex justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover border border-gray-600 shadow-md"
                />
              </div>
            )}
          </div>

          {/* Status Messages */}
          {error && <p className="text-red-500 text-center text-sm">{error}</p>}
          {success && (
            <p className="text-green-400 text-center text-sm">{success}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
              loading
                ? "bg-green-900 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {loading ? "Creating..." : "Create Server"}
          </button>
        </form>

        <button
          onClick={() => router.push("/servers")}
          className="mt-6 w-full py-2 text-sm rounded-md bg-gray-700 hover:bg-gray-600 transition-all"
        >
          ← Back to Servers
        </button>
      </div>
    </div>
  );
}
