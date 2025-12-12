"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Overview from "./components/ServerSettings/Overview";
import Role from "./components/ServerSettings/Role";
import Members from "./components/ServerSettings/Members";
import InvitePeople from "./components/ServerSettings/InvitePeople";
import Leave from "./components/ServerSettings/Leave";
import DangerZone from "./components/ServerSettings/DangerZone";
import AddChannel from "./components/ServerSettings/AddChannel";
import { getServerDetails, ServerDetails } from "../api";

const initialRoles = [
  {
    id: 1,
    name: "Admin",
    color: "#ed4245",
    permissions: ["Manage Server", "Ban Members"],
  },
  {
    id: 2,
    name: "Moderator",
    color: "#5865f2",
    permissions: ["Kick Members", "Manage Messages"],
  },
  { id: 3, name: "Member", color: "#43b581", permissions: ["Send Messages"] },
];

export default function ServerSettingsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("Overview");
  const [roles, setRoles] = useState(initialRoles);
  const [serverDetails, setServerDetails] = useState<ServerDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve serverId on the client inside useEffect to avoid using
  // next/navigation's useSearchParams during prerender which can cause
  // build-time errors. This reads URLSearchParams from window.location
  // and falls back to localStorage.
  const [serverId, setServerId] = useState<string>("");

  // compute the serverId once on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serverIdFromUrl = params.get("serverId");
    const serverIdFromStorage = localStorage.getItem("currentServerId");
    const resolved = serverIdFromUrl || serverIdFromStorage || "";
    setServerId(resolved);
  }, []);

  // load server details when serverId is resolved
  useEffect(() => {
    const loadServerDetails = async () => {
      if (!serverId || serverId.trim() === "") {
        setError("No server ID provided. Please select a server first.");
        setLoading(false);
        return;
      }

      try {
        const details = await getServerDetails(serverId);
        setServerDetails(details);
        setError(null);
      } catch (err) {
        console.error("Failed to load server details:", err);
        setError("Failed to load server details");
      } finally {
        setLoading(false);
      }
    };

    loadServerDetails();
  }, [serverId]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-black items-center justify-center">
        <div className="text-white">Loading server settings...</div>
      </div>
    );
  }

  if (error || !serverDetails) {
    return (
      <div className="flex min-h-screen bg-black items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">
            {error || "Server not found"}
          </div>
          <div className="text-white mb-4">
            Please ensure you have selected a server or provide a valid server
            ID.
          </div>
          <button
            onClick={() => router.push("/servers")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Servers
          </button>
        </div>
      </div>
    );
  }

  let Content;
  switch (selected) {
    case "Overview":
      Content = (
        <Overview
          serverId={serverId}
          serverDetails={serverDetails}
          onServerUpdate={setServerDetails}
        />
      );
      break;
    case "Role":
      Content = <Role roles={roles} setRoles={setRoles} />;
      break;
    case "Members":
      Content = <Members serverId={serverId} />;
      break;
    case "Invite people":
      Content = <InvitePeople serverId={serverId} />;
      break;
    case "Leave":
      Content = <Leave serverId={serverId} serverDetails={serverDetails} />;
      break;
    case "Danger Zone":
      Content = (
        <DangerZone
          serverId={serverId}
          serverName={serverDetails?.name || ""}
          isOwner={serverDetails?.isOwner || false}
        />
      );
      break;
    case "Add Channel":
      Content = <AddChannel />;
      break;
    default:
      Content = (
        <Overview
          serverId={serverId}
          serverDetails={serverDetails}
          onServerUpdate={setServerDetails}
        />
      );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar selected={selected} onSelect={setSelected} />
      <main className="flex-1 p-8 bg-black relative">
        {/* 🔙 Back to Servers Button */}
        <button
          onClick={() => router.push("/servers")}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Servers</span>
        </button>

        <div className="mt-14">{Content}</div>
      </main>
    </div>
  );
}
