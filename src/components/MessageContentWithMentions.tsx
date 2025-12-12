"use client";

import React from 'react';

interface MentionContentProps {
  content: string;
  currentUserId?: string;
}

export default function MessageContentWithMentions({ content, currentUserId }: MentionContentProps) {
  const renderContent = () => {
    if (!content) return null;

    // Regular expressions for different mention types
    const roleMentionRegex = /@&([a-zA-Z0-9_\s]+)/g;
    const everyoneMentionRegex = /@(everyone|here)/g;
    const userMentionRegex = /@([a-zA-Z0-9_]+)/g;

    let parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let keyIndex = 0;

    // Find all mentions and their positions
    const mentions: Array<{ start: number; end: number; type: 'user' | 'role' | 'everyone'; match: string }> = [];
    const usedPositions = new Set<number>(); // Track positions already used by mentions

    // Everyone mentions (highest priority) - find @everyone and @here
    const everyoneMatches = Array.from(content.matchAll(everyoneMentionRegex));
    everyoneMatches.forEach(match => {
      mentions.push({
        start: match.index!,
        end: match.index! + match[0].length,
        type: 'everyone',
        match: match[0]
      });
      // Mark all positions in this range as used
      for (let i = match.index!; i < match.index! + match[0].length; i++) {
        usedPositions.add(i);
      }
    });

    // Role mentions (second priority)
    const roleMatches = Array.from(content.matchAll(roleMentionRegex));
    roleMatches.forEach(match => {
      // Check if this position is already used
      const isOverlapping = Array.from({length: match[0].length}, (_, i) => match.index! + i)
        .some(pos => usedPositions.has(pos));
      
      if (!isOverlapping) {
        mentions.push({
          start: match.index!,
          end: match.index! + match[0].length,
          type: 'role',
          match: match[0]
        });
        // Mark positions as used
        for (let i = match.index!; i < match.index! + match[0].length; i++) {
          usedPositions.add(i);
        }
      }
    });

    // User mentions (lowest priority, excludes everyone/here)
    const userMatches = Array.from(content.matchAll(userMentionRegex));
    userMatches.forEach(match => {
      const mentionText = match[1];
      
      // Skip @everyone and @here as they're handled above
      if (mentionText === 'everyone' || mentionText === 'here') {
        return;
      }
      
      // Check if this position is already used
      const isOverlapping = Array.from({length: match[0].length}, (_, i) => match.index! + i)
        .some(pos => usedPositions.has(pos));
      
      if (!isOverlapping) {
        mentions.push({
          start: match.index!,
          end: match.index! + match[0].length,
          type: 'user',
          match: match[0]
        });
        // Mark positions as used
        for (let i = match.index!; i < match.index! + match[0].length; i++) {
          usedPositions.add(i);
        }
      }
    });

    // Sort mentions by position
    mentions.sort((a, b) => a.start - b.start);

    // Process each mention
    mentions.forEach((mention) => {
      // Add text before mention
      if (mention.start > lastIndex) {
        parts.push(content.substring(lastIndex, mention.start));
      }

      // Add mention with styling
      const isCurrentUser = mention.type === 'user' && mention.match.substring(1) === currentUserId;
      
      parts.push(
        <span
          key={keyIndex++}
          className={`inline-flex items-center px-1 py-0.5 rounded text-sm font-medium ${
            mention.type === 'user'
              ? isCurrentUser
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : mention.type === 'role'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
          } hover:bg-opacity-30 transition-colors cursor-pointer`}
          title={
            mention.type === 'everyone' 
              ? 'Mentions everyone in the channel'
              : mention.type === 'role'
              ? `Mentions role: ${mention.match}`
              : `Mentions user: ${mention.match}`
          }
        >
          {mention.match}
        </span>
      );

      lastIndex = mention.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    // If no mentions found, return original content
    if (parts.length === 0) {
      return content;
    }

    return parts.map((part, index) => 
      typeof part === 'string' ? <span key={`text-${index}`}>{part}</span> : part
    );
  };

  return (
    <div className="text-gray-300 leading-relaxed break-words">
      {renderContent()}
    </div>
  );
}

// Optional: Component for rendering mentions in message previews or notifications
export function MentionPreview({ 
  content, 
  maxLength = 100 
}: { 
  content: string; 
  maxLength?: number; 
}) {
  // Strip mention formatting for preview
  const cleanContent = content
    .replace(/@&([a-zA-Z0-9_\s]+)/g, '@$1') // Convert role mentions
    .replace(/@(everyone|here)/g, '@$1')    // Keep everyone mentions
    .replace(/@([a-zA-Z0-9_]+)/g, '@$1');  // Keep user mentions

  const truncated = cleanContent.length > maxLength 
    ? cleanContent.substring(0, maxLength) + '...'
    : cleanContent;

  return (
    <span className="text-gray-400 text-sm">
      {truncated}
    </span>
  );
}
