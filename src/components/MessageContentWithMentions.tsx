"use client";

import React from "react";



interface Role {
  id: string;
  name: string;
  color?: string;
}

interface MentionContentProps {
  content: string;
  isValidUsernameMention: (mention: string) => boolean;
  currentUserId?: string;
  currentUsername?: string;
  serverRoles: Role[];
  currentUserRoleIds: string[];

  onMentionClick?: (userId: string, username: string) => void;
  onRoleMentionClick?: (roleName: string) => void;
}



export default function MessageContentWithMentions({
  content,
  currentUsername,
  serverRoles,
  currentUserRoleIds,
  isValidUsernameMention,
  onMentionClick,
  onRoleMentionClick,
}: MentionContentProps) {
  const renderContent = () => {
    if (!content) return null;

    const everyoneMentionRegex = /@(everyone|here)\b/g;
    const roleMentionRegex = /@&([a-zA-Z_][a-zA-Z0-9_\s]*)\b/g;
    const userMentionRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

    
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+\.[a-zA-Z]{2,})/g;

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let keyIndex = 0;

    const mentions: Array<{
      start: number;
      end: number;
      type: "user" | "role" | "everyone" | "url"; 
      match: string;
      displayText: string;
      url?: string; 
    }> = [];

    const usedPositions = new Set<number>();

    Array.from(content.matchAll(everyoneMentionRegex)).forEach((match) => {
      mentions.push({
        start: match.index!,
        end: match.index! + match[0].length,
        type: "everyone",
        match: match[0],
        displayText: match[0],
      });

      for (let i = match.index!; i < match.index! + match[0].length; i++) {
        usedPositions.add(i);
      }
    });

    Array.from(content.matchAll(roleMentionRegex)).forEach((match) => {
      const roleName = match[1].trim();

      const role = serverRoles.find(
        (r) => r.name.toLowerCase() === roleName.toLowerCase()
      );

      if (!role) return;

      const isOverlapping = Array.from(
        { length: match[0].length },
        (_, i) => match.index! + i
      ).some((pos) => usedPositions.has(pos));

      if (isOverlapping) return;

      mentions.push({
        start: match.index!,
        end: match.index! + match[0].length,
        type: "role",
        match: match[0], 
        displayText: `@${role.name}`, 
      });

      for (let i = match.index!; i < match.index! + match[0].length; i++) {
        usedPositions.add(i);
      }
    });

    Array.from(content.matchAll(userMentionRegex)).forEach((match) => {
      const username = match[1];
      if (username === "everyone" || username === "here") return;

      const isOverlapping = Array.from(
        { length: match[0].length },
        (_, i) => match.index! + i
      ).some((pos) => usedPositions.has(pos));

      if (isOverlapping) return;
      const mentionText = match[0]; 

      if (!isValidUsernameMention(mentionText)) {
        return;
      }
      mentions.push({
        start: match.index!,
        end: match.index! + match[0].length,
        type: "user",
        match: match[0],
        displayText: match[0],
      });

      for (let i = match.index!; i < match.index! + match[0].length; i++) {
        usedPositions.add(i);
      }
    });

    
    Array.from(content.matchAll(urlRegex)).forEach((match) => {
      const isOverlapping = Array.from(
        { length: match[0].length },
        (_, i) => match.index! + i
      ).some((pos) => usedPositions.has(pos));

      if (isOverlapping) return;

      // Prepare the full URL with protocol
      let fullUrl = match[0];
      if (match[0].startsWith("www.")) {
        fullUrl = `https://${match[0]}`;
      }

      mentions.push({
        start: match.index!,
        end: match.index! + match[0].length,
        type: "url",
        match: match[0],
        displayText: match[0],
        url: fullUrl,
      });

      for (let i = match.index!; i < match.index! + match[0].length; i++) {
        usedPositions.add(i);
      }
    });

    mentions.sort((a, b) => a.start - b.start);

    /* -------------------- RENDER -------------------- */
    mentions.forEach((mention) => {
      if (mention.start > lastIndex) {
        parts.push(content.substring(lastIndex, mention.start));
      }

      // ✅ NEW: Handle URL rendering
      if (mention.type === "url") {
        parts.push(
          <a
            key={keyIndex++}
            href={mention.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline hover:underline-offset-2 transition-colors break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {mention.displayText}
          </a>
        );
        lastIndex = mention.end;
        return;
      }

      // Existing mention rendering logic
      const username = mention.match.substring(1);
      const roleName =
        mention.type === "role" ? mention.match.substring(2) : "";

      const role =
        mention.type === "role"
          ? serverRoles.find(
              (r) => r.name.toLowerCase() === roleName.toLowerCase()
            )
          : null;

      const isCurrentUserMention =
        mention.type === "user" &&
        currentUsername &&
        username.toLowerCase() === currentUsername.toLowerCase();

      const isUserInRole =
        mention.type === "role" && role && currentUserRoleIds.includes(role.id);

      parts.push(
        <span
          key={keyIndex++}
          className="inline-flex items-center text-xs font-bold tracking-wide cursor-pointer"
          style={
            mention.type === "role" && role?.color
              ? {
                  backgroundColor: isUserInRole
                    ? "rgba(250, 204, 21, 0.45)"
                    : "transparent",
                  color: role.color,
                  borderRadius: "6px",
                  padding: "2px 8px",
                  border: isUserInRole
                    ? "1px solid rgba(250, 204, 21, 0.9)"
                    : "none",
                }
              : mention.type === "user"
              ? {
                  backgroundColor: isCurrentUserMention
                    ? "rgba(88,101,242,0.35)"
                    : "rgba(88,101,242,0.18)",
                  color: "#ffffff",
                  borderRadius: "6px",
                  padding: "2px 6px",
                }
              : {
                  backgroundColor: "rgba(250,204,21,0.25)",
                  color: "#facc15",
                  borderRadius: "6px",
                  padding: "2px 6px",
                }
          }
          onClick={
            mention.type === "user" && onMentionClick
              ? () => onMentionClick(username, username)
              : mention.type === "role" && onRoleMentionClick
              ? () => onRoleMentionClick(roleName)
              : undefined
          }
        >
          {mention.displayText}
        </span>
      );

      lastIndex = mention.end;
    });

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="text-gray-300 leading-relaxed break-words">
      {renderContent()}
    </div>
  );
}
