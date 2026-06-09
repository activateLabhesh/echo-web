import { Socket } from "socket.io-client";
import { createAuthSocket } from "@/socket";

let presenceSocket: Socket | null = null;
let presenceUserId: string | null = null;

export const getVoicePresenceSocket = (userId: string): Socket => {
  if (!presenceSocket || presenceUserId !== userId) {
    presenceSocket?.disconnect();
    presenceSocket = createAuthSocket(userId);
    presenceUserId = userId;
  }
  return presenceSocket;
};

export const emitJoinVoiceChannel = (payload: {
  channelId: string;
  serverId?: string;
  username?: string;
  userId?: string;
  muted?: boolean;
  video?: boolean;
}) => {
  presenceSocket?.emit("join_voice_channel", payload);
};

export const emitLeaveVoiceChannel = (payload: {
  channelId: string;
  serverId?: string;
}) => {
  presenceSocket?.emit("leave_voice_channel", payload);
};

export const emitVoiceStateUpdate = (payload: {
  channelId: string;
  serverId?: string;
  muted: boolean;
  video: boolean;
  screenSharing?: boolean;
}) => {
  presenceSocket?.emit("voice_state_update", payload);
};

export const disconnectVoicePresenceSocket = () => {
  presenceSocket?.disconnect();
  presenceSocket = null;
  presenceUserId = null;
};
