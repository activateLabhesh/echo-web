export interface Message {
  id?: string;
  name: string;
  seed: string;
  color: string;
  message: string;
  timestamp: string;
  media_url?: string;
  mediaUrl?: string;
  content?: string;
  sender_id?: string;
  channel_id?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  user_ids?: string[];
  reacted_by_me?: boolean;
}

export interface MessageReactionRecord {
  message_id?: string;
  dm_message_id?: string;
  emoji: string;
  user_id?: string;
}

export interface MessageSearchResult {
  id: string;
  content: string;
  channel_id?: string;
  channel_name?: string;
  sender_id?: string;
  username?: string;
  sender_name?: string;
  timestamp?: string;
  media_url?: string;
}

export interface PinnedMessage {
  id: string;
  message_id?: string;
  dm_message_id?: string;
  content?: string;
  username?: string;
  sender_name?: string;
  timestamp?: string;
  pinned_at?: string;
  channel_id?: string;
  thread_id?: string;
}

export const MAX_PINNED_MESSAGES = 3;
