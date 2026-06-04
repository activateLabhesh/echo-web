export interface ChimeMeetingResponse {
  meeting: {
    MeetingId: string;
    MediaPlacement: {
      AudioHostUrl: string;
      AudioFallbackUrl: string;
      SignalingUrl: string;
      TurnControlUrl: string;
      ScreenDataUrl: string;
      ScreenViewingUrl: string;
      ScreenSharingUrl: string;
    };
    ExternalMeetingId?: string;
  };
  attendee: {
    AttendeeId: string;
    ExternalUserId: string;
    JoinToken: string;
  };
}
