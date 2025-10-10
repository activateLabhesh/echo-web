// components/VideoPanel.tsx
import { useEffect, useRef } from "react";

type Remote = { id: string; stream: MediaStream };

interface Props {
  localStream?: MediaStream | null;
  remotes?: Remote[];
  collapsed?: boolean;
}

export default function VideoPanel({
  localStream,
  remotes = [],
  collapsed,
}: Props) {
  const localRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current && localStream) {
      if (localRef.current.srcObject !== localStream) {
        localRef.current.srcObject = localStream;
      }
    }
  }, [localStream]);

  const totalParticipants = 1 + remotes.length;

  const getGridCols = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    return "grid-cols-4";
  };

  const getGridRows = (count: number) => {
    if (count <= 2) return "grid-rows-1";
    if (count <= 4) return "grid-rows-2";
    if (count <= 6) return "grid-rows-2";
    return "grid-rows-3";
  };

  if (collapsed) {
    return <div className="w-full h-0 overflow-hidden" />;
  }

  return (
    // ➡️ FIX 1: Changed w-screen h-screen to w-full h-full
    <div className="w-full h-full bg-black">
      <div
        className={`grid ${getGridCols(totalParticipants)} ${getGridRows(
          totalParticipants
        )} gap-2 w-full h-full p-2`} // Added p-2 for minor spacing
      >
        {/* Local video */}
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-blue-500">
          {localStream ? (
            <video
              ref={localRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <div className="w-16 h-16 mx-auto mb-2 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold">You</span>
                </div>
                <p className="text-sm">Camera off</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            You
          </div>
        </div>

        {/* Remote videos */}
        {remotes.map((r) => (
          <RemoteVideo key={r.id} stream={r.stream} userId={r.id} />
        ))}
      </div>
    </div>
  );
}

function RemoteVideo({
  stream,
  userId,
}: {
  stream: MediaStream;
  userId: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-600">
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="text-center text-white">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">
                {userId.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-xs">Camera off</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {userId}
      </div>
    </div>
  );
}
