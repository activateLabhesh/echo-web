"use client";

import React, { useState } from "react";
import { useImageModal } from "@/contexts/ImageModalContext";

interface MessageAttachmentProps {
  media_url: string;
  media_type?: string;
}

export default function MessageAttachment({
  media_url,
  media_type,
}: MessageAttachmentProps) {
  const { openImage } = useImageModal();

  if (!media_url) return null;

  // Check if it's a blob URL (from local file uploads) or has image extension
  const isBlobUrl = media_url.startsWith("blob:");
  const ext = media_url.split("?")[0].split(".").pop()?.toLowerCase() || "";
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];

  // Determine if this is an image
  const isImage =
    isBlobUrl ||
    imageExts.includes(ext) ||
    (media_type && media_type.startsWith("image/"));

  if (isImage) {
    return (
      <>
        {/* Thumbnail - Square constrained display like WhatsApp */}
        <img
          src={media_url}
          alt="attachment"
          className="w-40 h-40 rounded-lg object-cover border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
          onClick={() => openImage(media_url)}
          onError={(e) => {
            console.error("Failed to load image:", media_url);
            e.currentTarget.style.display = "none";
          }}
        />
      </>
    );
  }

  // For non-image files, show download link with appropriate icon
  const getFileIcon = (extension: string) => {
    switch (extension) {
      case "pdf":
        return "📄";
      case "doc":
      case "docx":
        return "📝";
      case "xls":
      case "xlsx":
        return "📊";
      case "ppt":
      case "pptx":
        return "📋";
      case "zip":
      case "rar":
      case "7z":
        return "🗜️";
      case "mp3":
      case "wav":
      case "ogg":
        return "🎵";
      case "mp4":
      case "avi":
      case "mov":
        return "🎬";
      default:
        return "📎";
    }
  };

  return (
    <a
      href={media_url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
    >
      <span className="text-lg">{getFileIcon(ext)}</span>
      <span className="text-sm">
        Download file {ext ? `(${ext.toUpperCase()})` : ""}
      </span>
    </a>
  );
}
