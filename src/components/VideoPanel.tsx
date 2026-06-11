import { useEffect, useRef } from "react";

type Remote = { id: string; stream: MediaStream };

interface Props {
  localStream?: MediaStream | null;
  remotes?: Remote[];
  collapsed?: boolean;
}

// 1. Reusable Expand Icon
const ExpandIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

// 2. Reusable Compress Icon (when already fullscreen)
const CompressIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
  </svg>
);

function VideoTile({
  stream,
  name,
  isLocal = false,
}: {
  stream?: MediaStream | null;
  name: string;
  isLocal?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach the stream to the video element
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  // Handle Fullscreen on the Container (NOT the video tag)
const toggleFullscreen = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const container = containerRef.current;

  if (!container) return;

  try {
    if (!document.fullscreenElement) {
      // We use 'await' here to catch the exact Promise rejection
      await container.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (err: any) {
    // THIS WILL TELL US EXACTLY WHY CHROME IS BLOCKING IT
    console.error("Fullscreen failed:", err);
    alert(`Chrome blocked fullscreen: ${err.message}`);
  }
};

  return (
    <div
      ref={containerRef}
      className="group relative w-full h-full min-h-0 rounded-lg overflow-hidden border border-slate-700 bg-[#1E2124] transition-all"
    >
      {/* Video or Camera Off Fallback */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal} // Only mute if it's your own stream
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#1E2124]">
          <div className="text-center text-slate-300">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-slate-600 text-2xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm">Camera off</p>
          </div>
        </div>
      )}

      {/* Name Label */}
      <div className="absolute bottom-4 right-4 rounded bg-slate-900/80 px-3 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
        {name} {isLocal && "(You)"}
      </div>

      {/* Expand Icon - Visible on hover */}
      
    </div>
  );
}

// 4. Main Panel Component
export default function VideoPanel({
  localStream,
  remotes = [],
  collapsed,
}: Props) {
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
    return <div className="h-0 w-full overflow-hidden" />;
  }

  return (
    <div className="h-full w-full bg-[#111315] p-4">
      <div
        className="h-full w-full gap-4"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {/* Local user tile */}
        <VideoTile stream={localStream} name="Me" isLocal={true} />

        {/* Remote user tiles */}
        {remotes.map((r) => (
          <VideoTile key={r.id} stream={r.stream} name={r.id} />
        ))}
      </div>
    </div>
  );
}
