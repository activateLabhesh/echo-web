"use client";

import React, { useState, useEffect } from 'react';
import { Bell, X, Check, User, Users, AtSign } from 'lucide-react';

interface MentionNotification {
  id: string;
  message_id: string;
  mention_type: 'user' | 'role' | 'everyone';
  is_read: boolean;
  created_at: string;
  messages: {
    content: string;
    created_at: string;
    channel_id: string;
    users: {
      username: string;
      avatar_url?: string;
    };
    channels: {
      name: string;
      server_id: string;
    };
  };
}

interface MentionNotificationsProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage?: (channelId: string, messageId: string) => void;
}

export default function MentionNotifications({ 
  isOpen, 
  onClose, 
  onNavigateToMessage 
}: MentionNotificationsProps) {
  const [mentions, setMentions] = useState<MentionNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  // Fetch mentions
  const fetchMentions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/mentions?unreadOnly=${filter === 'unread'}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMentions(data);
      }
    } catch (error) {
      console.error('Failed to fetch mentions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark mention as read
  const markAsRead = async (mentionId: string) => {
    try {
      const response = await fetch(`/api/mentions/${mentionId}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });
      
      if (response.ok) {
        setMentions(prev => 
          prev.map(mention => 
            mention.id === mentionId 
              ? { ...mention, is_read: true }
              : mention
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark mention as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadMentions = mentions.filter(m => !m.is_read);
    
    for (const mention of unreadMentions) {
      await markAsRead(mention.id);
    }
  };

  // Handle mention click
  const handleMentionClick = (mention: MentionNotification) => {
    markAsRead(mention.id);
    onNavigateToMessage?.(mention.messages.channel_id, mention.message_id);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      fetchMentions();
    }
  }, [isOpen, filter]);

  const getMentionIcon = (type: string) => {
    switch (type) {
      case 'user': return <AtSign size={16} className="text-blue-400" />;
      case 'role': return <Users size={16} className="text-purple-400" />;
      case 'everyone': return <User size={16} className="text-red-400" />;
      default: return <Bell size={16} className="text-gray-400" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Bell className="text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-white">Mentions</h2>
            {mentions.filter(m => !m.is_read).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {mentions.filter(m => !m.is_read).length}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Filter buttons */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
            </div>
            
            {mentions.some(m => !m.is_read) && (
              <button
                onClick={markAllAsRead}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Mark all read
              </button>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : mentions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Bell size={48} className="mb-4 opacity-50" />
              <p className="text-lg mb-2">No mentions found</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {mentions.map((mention) => (
                <div
                  key={mention.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-800 ${
                    !mention.is_read ? 'bg-blue-900/20 border-l-4 border-l-blue-400' : ''
                  }`}
                  onClick={() => handleMentionClick(mention)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getMentionIcon(mention.mention_type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-white">
                          {mention.messages.users.username}
                        </span>
                        <span className="text-gray-400 text-sm">mentioned you in</span>
                        <span className="text-blue-400 text-sm">
                          #{mention.messages.channels.name}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {formatTimeAgo(mention.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-gray-300 text-sm line-clamp-2 break-words">
                        {mention.messages.content}
                      </p>
                      
                      <div className="flex items-center mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          mention.mention_type === 'user' 
                            ? 'bg-blue-500/20 text-blue-300'
                            : mention.mention_type === 'role'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {mention.mention_type === 'everyone' ? '@everyone' : `@${mention.mention_type}`}
                        </span>
                        
                        {!mention.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(mention.id);
                            }}
                            className="ml-2 text-blue-400 hover:text-blue-300"
                            title="Mark as read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
