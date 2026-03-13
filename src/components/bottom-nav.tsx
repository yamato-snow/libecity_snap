"use client";

import Link from "next/link";

interface BottomNavProps {
  activeTab: "camera" | "album";
  onCameraPress?: () => void;
}

export function BottomNav({ activeTab, onCameraPress }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      {/* Background with subtle top shadow */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-gray-100">
        <div className="relative flex items-end justify-center h-16 max-w-md mx-auto px-6">

          {/* 撮影 tab - left side */}
          <Link
            href="/"
            className={`flex-1 flex flex-col items-center gap-0.5 pb-2 pt-3 transition-all ${
              activeTab === "camera"
                ? "text-emerald-500"
                : "text-gray-400 hover:text-gray-500"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={activeTab === "camera" ? 2.5 : 1.8}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            <span className={`text-[10px] tracking-wide ${
              activeTab === "camera" ? "font-bold" : "font-medium"
            }`}>
              ホーム
            </span>
          </Link>

          {/* Center FAB - integrated into nav */}
          <div className="flex flex-col items-center gap-0.5 pb-2 pt-3 mx-4">
            {onCameraPress ? (
              <button
                onClick={onCameraPress}
                className="w-14 h-14 rounded-full
                           bg-gradient-to-br from-emerald-400 to-emerald-600
                           shadow-lg shadow-emerald-500/25
                           flex items-center justify-center
                           active:scale-95 transition-transform
                           ring-4 ring-white
                           -translate-y-1"
                aria-label="写真を追加"
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            ) : (
              <Link
                href="/"
                className="w-14 h-14 rounded-full
                           bg-gradient-to-br from-emerald-400 to-emerald-600
                           shadow-lg shadow-emerald-500/25
                           flex items-center justify-center
                           active:scale-95 transition-transform
                           ring-4 ring-white
                           -translate-y-1"
                aria-label="写真を追加"
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            )}
            <span className="text-[10px] text-gray-400 font-medium mt-0.5 tracking-wide">投稿</span>
          </div>

          {/* アルバム tab - right side */}
          <Link
            href="/album"
            className={`flex-1 flex flex-col items-center gap-0.5 pb-2 pt-3 transition-all ${
              activeTab === "album"
                ? "text-emerald-500"
                : "text-gray-400 hover:text-gray-500"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={activeTab === "album" ? 2.5 : 1.8}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className={`text-[10px] tracking-wide ${
              activeTab === "album" ? "font-bold" : "font-medium"
            }`}>
              アルバム
            </span>
          </Link>

        </div>
      </div>
    </nav>
  );
}
