// src/app/socket-test/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

const SocketTestPage = () => {
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const testConnection = () => {
    addLog("🔌 Starting connection test...");
    setConnectionStatus("Connecting...");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    addLog(`📡 Connecting to: ${API_URL}`);

    const testSocket = io(API_URL, {
      withCredentials: false,
      transports: ["polling", "websocket"],
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
    });

    testSocket.on("connect", () => {
      addLog(`✅ Connected! Socket ID: ${testSocket.id}`);
      addLog(`🔌 Transport: ${testSocket.io.engine.transport.name}`);
      setConnectionStatus("Connected");
    });

    testSocket.on("connect_error", (error) => {
      addLog(`❌ Connection Error: ${error.message}`);
      setConnectionStatus("Connection Failed");
    });

    testSocket.on("disconnect", (reason) => {
      addLog(`❌ Disconnected: ${reason}`);
      setConnectionStatus("Disconnected");
    });

    testSocket.io.on("error", (error) => {
      addLog(`🔥 Engine Error: ${error}`);
    });

    testSocket.io.on("open", () => {
      addLog(`🔓 Engine Opened`);
    });

    testSocket.io.on("close", (reason) => {
      addLog(`🔒 Engine Closed: ${reason}`);
    });

    setSocket(testSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnectionStatus("Disconnected");
      addLog("🔌 Manually disconnected");
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Socket.io Connection Test
        </h1>

        {/* Status */}
        <div className="mb-8 text-center">
          <div
            className={`inline-block px-6 py-3 rounded-lg text-lg font-semibold ${
              connectionStatus === "Connected"
                ? "bg-green-600"
                : connectionStatus === "Connecting..."
                  ? "bg-yellow-600"
                  : connectionStatus === "Connection Failed"
                    ? "bg-red-600"
                    : "bg-gray-600"
            }`}
          >
            Status: {connectionStatus}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={testConnection}
            disabled={connectionStatus === "Connecting..."}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Test Connection
          </button>

          <button
            onClick={disconnect}
            disabled={!socket || connectionStatus === "Disconnected"}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Disconnect
          </button>

          <button
            onClick={clearLogs}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Clear Logs
          </button>
        </div>

        {/* Logs */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Connection Logs</h2>
          <div className="bg-black rounded p-3 h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">
                No logs yet. Click "Test Connection" to start.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Backend Check */}
        <div className="mt-8 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Backend Server Check</h2>
          <div className="space-y-2 text-sm">
            <div>
              • Backend should be running on:{" "}
              <code className="bg-gray-700 px-2 py-1 rounded">
                http://localhost:5000
              </code>
            </div>
            <div>
              • Test backend:{" "}
              <code className="bg-gray-700 px-2 py-1 rounded">
                curl http://localhost:5000
              </code>
            </div>
            <div>
              • Frontend running on:{" "}
              <code className="bg-gray-700 px-2 py-1 rounded">
                http://localhost:3000
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocketTestPage;
