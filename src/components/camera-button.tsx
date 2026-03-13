"use client";

import { useRef } from "react";

interface CameraButtonProps {
  onCapture: (files: File[]) => void;
  disabled?: boolean;
}

export function CameraButton({ onCapture, disabled }: CameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onCapture(Array.from(files));
    }
    // Reset so the same file can be selected again
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <label
      className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl
                  text-lg font-bold cursor-pointer transition-colors
                  ${
                    disabled
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700"
                  }`}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      カメラで撮る
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
    </label>
  );
}
