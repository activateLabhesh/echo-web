// src/components/VoiceNotifications.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaInfoCircle,
  FaTimes,
  FaRedo,
} from "react-icons/fa";
import { VoiceError, VoiceErrorHandler } from "@/lib/voiceErrorHandler";

interface Notification {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface VoiceNotificationsProps {
  className?: string;
}

const VoiceNotifications: React.FC<VoiceNotificationsProps> = ({
  className = "",
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, "id">) => {
    const id = Date.now().toString();
    const newNotification: Notification = {
      id,
      duration: 5000,
      dismissible: true,
      ...notification,
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto-dismiss after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Expose methods globally for use by other components
  useEffect(() => {
    (window as any).voiceNotifications = {
      addNotification,
      removeNotification,
      showError: (error: VoiceError, retryCallback?: () => void) => {
        addNotification({
          type: "error",
          title: "Voice Error",
          message: error.message,
          duration: error.severity === "critical" ? 0 : 8000, // Don't auto-dismiss critical errors
          action:
            retryCallback && VoiceErrorHandler.isRetryable(error)
              ? {
                  label: "Retry",
                  onClick: retryCallback,
                }
              : undefined,
        });
      },
      showSuccess: (message: string) => {
        addNotification({
          type: "success",
          title: "Success",
          message,
          duration: 3000,
        });
      },
      showWarning: (message: string) => {
        addNotification({
          type: "warning",
          title: "Warning",
          message,
          duration: 5000,
        });
      },
      showInfo: (message: string) => {
        addNotification({
          type: "info",
          title: "Info",
          message,
          duration: 4000,
        });
      },
    };

    return () => {
      delete (window as any).voiceNotifications;
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <FaCheckCircle className="text-green-400" />;
      case "warning":
        return <FaExclamationTriangle className="text-yellow-400" />;
      case "error":
        return <FaTimesCircle className="text-red-400" />;
      case "info":
        return <FaInfoCircle className="text-blue-400" />;
      default:
        return <FaInfoCircle className="text-gray-400" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-900 border-green-700";
      case "warning":
        return "bg-yellow-900 border-yellow-700";
      case "error":
        return "bg-red-900 border-red-700";
      case "info":
        return "bg-blue-900 border-blue-700";
      default:
        return "bg-gray-900 border-gray-700";
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 w-96 ${className}`}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getBackgroundColor(notification.type)} border rounded-lg p-4 shadow-lg animate-slide-in-right`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 pt-0.5">
              {getIcon(notification.type)}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {notification.message}
              </p>

              {notification.action && (
                <button
                  onClick={notification.action.onClick}
                  className="mt-2 inline-flex items-center space-x-1 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded transition-colors"
                >
                  <FaRedo size={10} />
                  <span>{notification.action.label}</span>
                </button>
              )}
            </div>

            {notification.dismissible && (
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes size={14} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Hook for using notifications in components
export const useVoiceNotifications = () => {
  const showError = (error: VoiceError, retryCallback?: () => void) => {
    (window as any).voiceNotifications?.showError(error, retryCallback);
  };

  const showSuccess = (message: string) => {
    (window as any).voiceNotifications?.showSuccess(message);
  };

  const showWarning = (message: string) => {
    (window as any).voiceNotifications?.showWarning(message);
  };

  const showInfo = (message: string) => {
    (window as any).voiceNotifications?.showInfo(message);
  };

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
};

export default VoiceNotifications;
