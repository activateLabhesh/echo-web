
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

  const total = 1 + remotes.length;

  const getLayout = (count: number) => {
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count === 3) return { cols: 3, rows: 1 };
    if (count === 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: Math.ceil(count / 4) };
  };

  const { cols, rows } = getLayout(total);

  if (collapsed) {
    return <div className="w-full h-0 overflow-hidden" />;
  }

  return (
    <div className="w-full h-full bg-black overflow-hidden">
      <div
        className="w-full h-full p-2 gap-2"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {/* Local video */}
        <div className="relative w-full h-full min-h-0 rounded-lg overflow-hidden border-2 border-blue-500 bg-zinc-900">
          {localStream ? (
            <video
              ref={localRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-16 h-16 mx-auto mb-2 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold">You</span>
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
    <div className="relative w-full h-full min-h-0 rounded-lg overflow-hidden border-2 border-gray-600 bg-zinc-900">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {userId}
      </div>
    </div>
  );
}
