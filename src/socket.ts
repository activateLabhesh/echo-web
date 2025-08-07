import { io } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_API_URL; 
export const socket = io(URL, {
  transports: ['websocket'],
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("✅ Connected to socket with id:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err);
});