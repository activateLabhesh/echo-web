"use client";

import React from "react";

interface LoaderProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  fullscreen?: boolean;
}

const sizeMap = {
  sm: "w-6 h-6 border-2",
  md: "w-10 h-10 border-4",
  lg: "w-14 h-14 border-4",
};

const Loader: React.FC<LoaderProps> = ({
  text = "Loading",
  size = "md",
  fullscreen = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullscreen ? "h-screen w-screen" : "h-full w-full"
      } bg-black`}
    >
      <div
        className={`${sizeMap[size]} rounded-full border-gray-700 border-t-blue-500 animate-spin`}
      />
      {text && <p className="mt-3 text-sm text-gray-400 text-center">{text}</p>}
    </div>
  );
};

export default Loader;
