"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";

export default function SharkWithEyes() {
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const sharkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const moveEye = (eye: HTMLDivElement | null) => {
        if (!eye || !sharkRef.current) return;

        const eyeRect = eye.getBoundingClientRect();
        const centerX = eyeRect.left + eyeRect.width / 2;
        const centerY = eyeRect.top + eyeRect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const angle = Math.atan2(dy, dx);

        const radius = 3;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        eye.style.transform = `translate(${x}px, ${y}px)`;
      };

      moveEye(leftEyeRef.current);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div ref={sharkRef} className="relative w-fit">
      <Image
        src="/shark.png"
        alt="Shark"
        width={600}
        height={400}
        className="relative !animate-float !rotate-[20deg]"
        priority
      />
      <div
        ref={leftEyeRef}
        className="absolute bg-white rounded-full w-2 h-2 z-10"
        style={{ top: "36%", left: "32%" }}
      ></div>
    </div>
  );
}
