"use client";

import { useState, useEffect } from "react";
import type { UploadQueueItem } from "@/types";

interface UploadToastProps {
  queue: UploadQueueItem[];
  stats: {
    total: number;
    pending: number;
    uploading: number;
    done: number;
    error: number;
  };
  onClearCompleted: () => void;
}

export function UploadToast({ queue, stats, onClearCompleted }: UploadToastProps) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  const allDone = stats.total > 0 && stats.done + stats.error === stats.total;
  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  // Show/hide logic
  useEffect(() => {
    if (queue.length > 0) {
      setVisible(true);
    }
  }, [queue.length]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    setExpanded(false);
    onClearCompleted();
  };

  if (!visible || queue.length === 0) return null;

  return (
    <div
      className="fixed bottom-28 left-4 right-4 z-35 animate-toast-in"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Compact view */}
        <div className="px-4 py-3 flex items-center gap-3">
          {!allDone ? (
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          ) : stats.error > 0 ? (
            <span className="text-red-500 flex-shrink-0">!</span>
          ) : (
            <span className="text-emerald-500 flex-shrink-0">✓</span>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {allDone
                ? stats.error > 0
                  ? `${stats.done}枚完了、${stats.error}枚エラー`
                  : `${stats.done}枚のアップロード完了`
                : `アップロード中... ${stats.done}/${stats.total}`}
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            {allDone ? "閉じる" : "✕"}
          </button>

          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>

        {/* Progress bar */}
        {!allDone && (
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Expanded view */}
        {expanded && (
          <div className="px-4 pb-3 max-h-40 overflow-y-auto border-t border-gray-50">
            <div className="space-y-1 pt-2">
              {queue.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-shrink-0 w-4 text-center">
                    {item.status === "pending" && <span className="text-gray-400">&#8226;</span>}
                    {item.status === "uploading" && (
                      <span className="inline-block w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {item.status === "done" && <span className="text-emerald-500">✓</span>}
                    {item.status === "error" && <span className="text-red-500">✕</span>}
                  </span>
                  <span className="truncate text-gray-600">{item.fileName}</span>
                  {item.status === "error" && (
                    <span className="text-red-400 text-xs ml-auto flex-shrink-0">{item.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
