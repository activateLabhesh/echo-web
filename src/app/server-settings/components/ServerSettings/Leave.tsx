import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { leaveServer } from "@/api";
import { ServerDetails } from "@/api/types/server.types";
import Toast from "@/components/Loader";

interface LeaveProps {
  serverId: string;
  serverDetails: ServerDetails | null;
}

export default function Leave({ serverId, serverDetails }: LeaveProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [input, setInput] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);

  const serverName = serverDetails?.name || "Unknown Server";

  useEffect(() => {
    setPageLoading(false);
  }, []);

  const handleLeaveServer = async () => {
    if (input !== serverName) {
      setError("Please type the server name exactly to confirm.");
      return;
    }

    setIsLeaving(true);
    setError("");

    try {
      await leaveServer(serverId);
      localStorage.removeItem("currentServerId");

      setShowToast(true);

      setTimeout(() => {
        router.push("/servers");
      }, 2000);
    } catch (err) {
      setError("Failed to leave server.");
      setIsLeaving(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-8 text-white">
      <h1 className="text-2xl font-bold mb-8">Leave Server</h1>

      {error && (
        <div className="bg-red-500 text-white p-3 rounded mb-4">{error}</div>
      )}

      <div className="flex items-center gap-4 mb-8 bg-[#23272a] p-4 rounded">
        <span className="text-3xl">⚠️</span>
        <div>
          <h2 className="font-semibold text-lg mb-1 text-[#ed4245]">
            Are you sure you want to leave{" "}
            <span className="text-white">{serverName}</span>?
          </h2>
          <p className="text-[#b5bac1]">
            You won't be able to rejoin this server unless you are re-invited.
          </p>
        </div>
      </div>
      {!showConfirm ? (
        <button
          className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] font-bold rounded px-6 py-2 shadow transition-all duration-200
            hover:from-[#ffcc33] hover:to-[#ffb347] hover:-translate-y-1 hover:scale-105 focus:outline-none disabled:opacity-50"
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
          onClick={() => setShowConfirm(true)}
          disabled={isLeaving}
        >
          Leave Server
        </button>
      ) : (
        <div>
          <label className="block font-semibold mb-2 text-[#b5bac1]">
            Type <span className="text-white">{serverName}</span> to confirm:
          </label>
          <input
            className="w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 mb-4 focus:border-[#b5bac1] focus:outline-none transition-all duration-200 transform hover:-translate-y-1 focus:-translate-y-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={serverName}
            disabled={isLeaving}
          />
          <div className="flex gap-2">
            <button
              className="bg-gradient-to-r from-[#ed4245] to-[#a32224] text-white font-bold rounded px-6 py-2 shadow transition-all duration-200
                hover:from-[#a32224] hover:to-[#ed4245] hover:-translate-y-1 hover:scale-105 focus:outline-none disabled:opacity-50"
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
              onClick={handleLeaveServer}
              disabled={isLeaving || input !== serverName}
            >
              {isLeaving ? "Leaving..." : "Confirm Leave"}
            </button>
            <button
              className="bg-[#23272a] text-[#ed4245] font-semibold rounded px-6 py-2 border-2 border-[#ed4245] transition hover:bg-[#ed4245] hover:text-white disabled:opacity-50"
              onClick={() => {
                setShowConfirm(false);
                setInput("");
                setError("");
              }}
              disabled={isLeaving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
