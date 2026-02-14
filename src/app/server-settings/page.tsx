"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Sidebar from "./components/Sidebar";
import Overview from "./components/ServerSettings/Overview";
import Role from "./components/ServerSettings/Role";
import Members from "./components/ServerSettings/Members";
import BannedUsers from "./components/ServerSettings/BannedUsers";
import InvitePeople from "./components/ServerSettings/InvitePeople";
import Leave from "./components/ServerSettings/Leave";
import DangerZone from "./components/ServerSettings/DangerZone";
import AddChannel from "./components/ServerSettings/AddChannel";

import { getServerDetails, getMyRoles } from "@/api";
import { type ServerDetails} from "@/api/types/server.types";

export default function ServerSettingsPage() {
  const router = useRouter();

  const [selected, setSelected] = useState<string>("Overview");

  const [serverId, setServerId] = useState<string | null>(null);
  const [serverIdReady, setServerIdReady] = useState(false);

  const [serverDetails, setServerDetails] = useState<ServerDetails | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  /* -----------------------------------------------------
   STEP 1: Resolve serverId safely on CLIENT
  ----------------------------------------------------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("serverId");
    const fromStorage = localStorage.getItem("currentServerId");

    const resolved = fromUrl || fromStorage;

    if (resolved) {
      setServerId(resolved);
    }

    setServerIdReady(true);
  }, []);


  useEffect(() => {
    if (!serverIdReady) return;

    if (!serverId) {
      setLoading(false);
      return;
    }

    const loadServerDetails = async () => {
      try {
        setLoading(true);

        const details = await getServerDetails(serverId);
        setServerDetails(details);

        // Check admin role
        const myRoles = await getMyRoles(serverId);
        const hasAdminRole = myRoles.some((role) => role.role_type === "admin");
        setIsAdmin(hasAdminRole);

        setError(null);
      } catch (err) {
        console.error("Failed to load server details:", err);
        setError("Failed to load server details");
      } finally {
        setLoading(false);
      }
    };

    loadServerDetails();
  }, [serverIdReady, serverId]);





  if (error || !serverDetails) {
    return (
      <div className="flex min-h-screen bg-black items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-xl mb-4">
            {error || "Server not found"}
          </div>
          <div className="text-gray-400 mb-6">
            Please select a server to continue.
          </div>
          <button
            onClick={() => router.push("/servers")}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
          >
            Go to Servers
          </button>
        </div>
      </div>
    );
  }


  const resolvedServerId: string = serverId!;
  const isOwner: boolean = Boolean(serverDetails.isOwner);


  let Content: JSX.Element;

  switch (selected) {
    case "Overview":
      Content = (
        <Overview
          serverId={resolvedServerId}
          serverDetails={serverDetails}
          onServerUpdate={setServerDetails}
          isOwner={isOwner}
          isAdmin={isAdmin}
        />
      );
      break;

    case "Role":
      Content = (
        <Role serverId={resolvedServerId} isOwner={isOwner} isAdmin={isAdmin} />
      );
      break;

    case "Members":
      Content = (
        <Members
          serverId={resolvedServerId}
          isOwner={isOwner}
          isAdmin={isAdmin}
        />
      );
      break;

    case "Bans":
      Content = (
        <BannedUsers
          serverId={resolvedServerId}
          isOwner={isOwner}
          isAdmin={isAdmin}
        />
      );
      break;

    case "Invite people":
      Content = <InvitePeople serverId={resolvedServerId} />;
      break;

    case "Leave":
      Content = (
        <Leave serverId={resolvedServerId} serverDetails={serverDetails} />
      );
      break;

    case "Danger Zone":
      Content = (
        <DangerZone
          serverId={resolvedServerId}
          serverName={serverDetails.name}
          isOwner={isOwner}
        />
      );
      break;

    case "Add Channel":
      Content = <AddChannel />;
      break;

    default:
      Content = (
        <Overview
          serverId={resolvedServerId}
          serverDetails={serverDetails}
          onServerUpdate={setServerDetails}
          isOwner={isOwner}
          isAdmin={isAdmin}
        />
      );
  }


  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar
        selected={selected}
        onSelect={setSelected}
        isOwner={isOwner}
        isAdmin={isAdmin}
      />

      <main className="flex-1 p-8 bg-black relative">
        {/* Back Button */}
        <button
          onClick={() => router.push("/servers")}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Servers</span>
        </button>

        <div className="mt-14">{Content}</div>
      </main>
    </div>
  );
}
