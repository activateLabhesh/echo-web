"use client";

import React from "react";

/* -------------------- TYPES -------------------- */

interface Role {
  id: string;
  name: string;
  color?: string;
}

interface MentionContentProps {
  content: string;
  currentUserId?: string;
  currentUsername?: string;
  serverRoles: Role[];
  currentUserRoleIds: string[];

  onMentionClick?: (userId: string, username: string) => void;
  onRoleMentionClick?: (roleName: string) => void;
}

/* -------------------- COMPONENT -------------------- */

export default function MessageContentWithMentions({
  content,
  currentUsername,
  serverRoles,
  currentUserRoleIds,
  onMentionClick,
  onRoleMentionClick,
}: MentionContentProps) {
  const renderContent = () => {
    if (!content) return null;

    const everyoneMentionRegex = /@(everyone|here)\b/g;
    const roleMentionRegex = /@&([a-zA-Z_][a-zA-Z0-9_\s]*)\b/g;
    const userMentionRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let keyIndex = 0;

    const mentions: Array<{
      start: number;
      end: number;
      type: "user" | "role" | "everyone";
      match: string;
      displayText: string;
    }> = [];

    const usedPositions = new Set<number>();

    /* -------------------- EVERYONE / HERE -------------------- */
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

    /* -------------------- ROLE -------------------- */
    Array.from(content.matchAll(roleMentionRegex)).forEach((match) => {
      const roleName = match[1].trim();

      const role = serverRoles.find(
        (r) => r.name.toLowerCase() === roleName.toLowerCase()
      );

      if (!role || !role.color) return;

      const isOverlapping = Array.from(
        { length: match[0].length },
        (_, i) => match.index! + i
      ).some((pos) => usedPositions.has(pos));

      if (isOverlapping) return;

      mentions.push({
        start: match.index!,
        end: match.index! + match[0].length,
        type: "role",
        match: match[0], // stored as @&Role
        displayText: `@${role.name}`, // shown as @Role
      });

      for (let i = match.index!; i < match.index! + match[0].length; i++) {
        usedPositions.add(i);
      }
    });

    /* -------------------- USER -------------------- */
    Array.from(content.matchAll(userMentionRegex)).forEach((match) => {
      const username = match[1];
      if (username === "everyone" || username === "here") return;

      const isOverlapping = Array.from(
        { length: match[0].length },
        (_, i) => match.index! + i
      ).some((pos) => usedPositions.has(pos));

      if (isOverlapping) return;

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

    mentions.sort((a, b) => a.start - b.start);

    /* -------------------- RENDER -------------------- */
    mentions.forEach((mention) => {
      if (mention.start > lastIndex) {
        parts.push(content.substring(lastIndex, mention.start));
      }

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
