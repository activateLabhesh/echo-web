import { useState, useRef, useEffect } from "react";
import { updateServer, ServerDetails } from "../../../api";

interface OverviewProps {
  serverId: string;
  serverDetails: ServerDetails;
  onServerUpdate: (details: ServerDetails) => void;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export default function Overview({ serverId, serverDetails, onServerUpdate, isOwner = false, isAdmin = false }: OverviewProps) {
  const canEdit = isOwner || isAdmin;
  const [serverName, setServerName] = useState<string>(serverDetails.name);
  const [serverIcon, setServerIcon] = useState<string>(serverDetails.icon_url || "/server-default.png");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setServerName(serverDetails.name);
    setServerIcon(serverDetails.icon_url || "/server-default.png");
  }, [serverDetails]);

  const handleIconClick = () => {
    if (canEdit) {
      fileInputRef.current?.click();
    }
  };
  
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setServerIcon(URL.createObjectURL(file));
    }
  };

  const handleSaveChanges = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");
    
    try {
      const updateData: { name?: string } = {};
      
      if (serverName !== serverDetails.name) {
        updateData.name = serverName;
      }
      
      console.log('Updating server with data:', updateData);
      console.log('Icon file:', iconFile);
      
      const updatedServer = await updateServer(serverId, updateData, iconFile || undefined);
      onServerUpdate(updatedServer);
      setSuccessMessage("Server updated successfully!");
      setIconFile(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error: any) {
      console.error('Failed to update server:', error);
      
      let errorMsg = 'Failed to update server. Please try again.';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = serverName !== serverDetails.name || 
                   iconFile !== null;

  return (
    <div className="max-w-xl mx-auto p-8 text-white">
      <h1 className="text-2xl font-bold mb-8">Overview</h1>
      <div className="mb-6">
        <label className="block font-semibold mb-2 text-[#b5bac1]">Server Name</label>
        <div className="flex items-center gap-2">
          <input
            className={`w-full bg-black text-white border-2 border-[#72767d] rounded px-4 py-3 focus:border-[#b5bac1] focus:outline-none transition-all duration-200 ${canEdit ? 'transform hover:-translate-y-1 focus:-translate-y-1' : 'cursor-not-allowed opacity-70'}`}
            value={serverName}
            onChange={(e) => canEdit && setServerName(e.target.value)}
            placeholder="Server Name"
            readOnly={!canEdit}
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block font-semibold mb-2 text-[#b5bac1]">Server Icon</label>
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              className={`w-16 h-16 rounded-full border-2 border-[#72767d] object-cover transition-all duration-200 ${canEdit ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:scale-105' : ''}`}
              src={serverIcon}
              alt="Server Icon"
              onClick={handleIconClick}
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleIconChange}
            />
            {canEdit && (
              <div
                className="absolute bottom-0 right-0 bg-[#72767d] rounded-full p-1 cursor-pointer hover:bg-[#b5bac1] transition"
                onClick={handleIconClick}
                title="Change Icon"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                    fill="#23272a"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-600 text-white rounded">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-600 text-white rounded">
          {errorMessage}
        </div>
      )}
      
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveChanges}
            disabled={!hasChanges || isLoading}
            className={`font-bold rounded px-6 py-2 shadow transition-all duration-200 focus:outline-none ${
              hasChanges && !isLoading
                ? "bg-gradient-to-r from-[#ffb347] to-[#ffcc33] text-[#23272a] hover:from-[#ffcc33] hover:to-[#ffb347] hover:-translate-y-1 hover:scale-105"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
            style={{
              backgroundSize: "200% 200%",
              backgroundPosition: "left center",
              transition: "background-position 0.5s, transform 0.2s"
            }}
            onMouseEnter={e => hasChanges && !isLoading && (e.currentTarget.style.backgroundPosition = "right center")}
            onMouseLeave={e => hasChanges && !isLoading && (e.currentTarget.style.backgroundPosition = "left center")}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
