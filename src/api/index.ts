import { api } from "./axios";
// src/api/index.ts
export * from "./auth.api";
export * from "./profile.api";
export * from "./server.api";
export * from "./roles.api";
export * from "./channel.api";
export * from "./axios";
export * from "./chime.api";
export * from "./friend.api";
export * from "./message.api";

// Test POST endpoint (for debugging)
export const testDirectPost = async (): Promise<any> => {
  const response = await api.post("/test-post-direct", { test: "data" });
  return response.data;
};
