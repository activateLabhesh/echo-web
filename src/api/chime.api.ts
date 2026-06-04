import { api, apiClient } from "./axios";
import { ChimeMeetingResponse } from "./types/chime.types";

/**
 * Join or create a Chime meeting for a voice channel
 * The backend handles creating the meeting if it doesn't exist
 */
export const joinChimeMeeting = async (
  channelId: string,
  userId: string
): Promise<ChimeMeetingResponse> => {
  try {
    const response = await apiClient.post<ChimeMeetingResponse>(
      "/api/chime/join",
      {
        channelId,
        userId,
      }
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Failed to join voice channel.";
    throw new Error(errorMessage);
  }
};

/**
 * Leave a Chime meeting
 */
export const leaveChimeMeeting = async (
  channelId: string,
  attendeeId: string
): Promise<void> => {
  try {
    await apiClient.post("/api/chime/leave", {
      channelId,
      attendeeId,
    });
  } catch (error: any) {
    console.error(
      "Error leaving Chime meeting:",
      error.response?.data || error.message || error
    );
    // Don't throw on leave - it's okay if this fails
  }
};

/**
 * Get active attendees in a Chime meeting
 */
export const getChimeMeetingAttendees = async (
  channelId: string
): Promise<any[]> => {
  try {
    const response = await apiClient.get(`/api/chime/attendees/${channelId}`);
    return response.data.attendees || [];
  } catch (error: any) {
    console.error(
      "Error getting Chime attendees:",
      error.response?.data || error.message || error
    );
    return [];
  }
};

/**
 * Start recording for a Chime meeting (server-side media capture)
 */
// export const startChimeRecording = async (channelId: string): Promise<{ recordingId: string }> => {
//   try {
//     const response = await apiClient.post('/api/chime/recording/start', {
//       channelId
//     });
//     return response.data;
//   } catch (error: any) {
//     console.error("Error starting Chime recording:", error.response?.data || error.message || error);
//     const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to start recording.";
//     throw new Error(errorMessage);
//   }
// };

/**
 * Stop recording for a Chime meeting
 */
// export const stopChimeRecording = async (channelId: string, recordingId: string): Promise<void> => {
//   try {
//     await apiClient.post('/api/chime/recording/stop', {
//       channelId,
//       recordingId
//     });
//   } catch (error: any) {
//     console.error("Error stopping Chime recording:", error.response?.data || error.message || error);
//     const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to stop recording.";
//     throw new Error(errorMessage);
//   }
// };
