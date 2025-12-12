// src/socket.ts
import { io, Socket, ManagerOptions, SocketOptions } from "socket.io-client";
import { VoiceVideoManager } from "./lib/VoiceVideoManager";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SOCKET_PATH = process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io";
const USE_CREDENTIALS = (process.env.NEXT_PUBLIC_SOCKET_WITH_CREDENTIALS ?? "true") === "true";

const baseConfig: Partial<ManagerOptions & SocketOptions> = {
  // Prefer WS, fall back to polling if needed
  transports: ["websocket", "polling"],
  upgrade: true,

  // Connection + heartbeat
  timeout: 20000,            // connect timeout

  // Reconnect/backoff
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,      // initial
  reconnectionDelayMax: 5000,  // cap
  randomizationFactor: 0.5,

  // CORS/cookies (only if your server allows credentials)
  withCredentials: USE_CREDENTIALS,

  // Create a fresh socket instance per call to avoid listener bleed
  forceNew: true,

  // Auto-connect on creation (your code expects this)
  autoConnect: true,

  // Path (useful if your server is not at /socket.io)
  path: SOCKET_PATH,
};

export const createAuthSocket = (userId: string, extraAuth?: Record<string, any>): Socket => {
  // NOTE: if you have a token, pass it in extraAuth (e.g., { token })
  const socket = io(API_URL, {
    ...baseConfig,
    auth: { userId, ...(extraAuth || {}) },
  });

  // Minimal, consistent logging
  socket.on("connect", () => {
    console.log("✅ Socket connected", { id: socket.id, url: API_URL, path: SOCKET_PATH });
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket connect_error:", { message: err?.message, data: err });
  });

  socket.on("disconnect", (reason) => {
    console.warn("⚠️ Socket disconnected:", reason);
    // server-initiated disconnects need an explicit reconnect
    if (reason === "io server disconnect") socket.connect();
  });

  return socket;
};

// Optional helper if you want to await readiness somewhere:
export const waitForConnect = (socket: Socket, ms = 15000) =>
  new Promise<void>((resolve, reject) => {
    if (socket.connected) return resolve();
    const t = setTimeout(() => {
      cleanup();
      reject(new Error("Socket connect timeout"));
    }, ms);
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (e: any) => {
      cleanup();
      reject(e);
    };
    const cleanup = () => {
      clearTimeout(t);
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
    };
    socket.on("connect", onConnect);
    socket.on("connect_error", onError);
  });

export { VoiceVideoManager };
