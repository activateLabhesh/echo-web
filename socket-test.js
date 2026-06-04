// Test socket connection directly in browser console
// Copy and paste this into your browser's developer console

const { io } = require("socket.io-client");

const testSocket = io("http://localhost:5000", {
  transports: ["polling", "websocket"],
  upgrade: true,
});

testSocket.on("connect", () => {});

testSocket.on("connect_error", (error) => {
  console.error("❌ Test connection failed:", error);
});

// Run this and see what happens
