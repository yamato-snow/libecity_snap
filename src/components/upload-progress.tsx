"use client";

import type { UploadQueueItem } from "@/types";

interface UploadProgressProps {
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

export function UploadProgress({ queue, stats, onClearCompleted }: UploadProgressProps) {
  if (queue.length === 0) return null;

  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          アップロード中 ({stats.done}/{stats.total})
        </span>
        {stats.done > 0 && stats.done === stats.total && (
          <button
            onClick={onClearCompleted}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            クリア
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Queue items */}
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {queue.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs">
            <span className="flex-shrink-0">
              {item.status === "pending" && (
                <span className="text-gray-400">⏳</span>
              )}
              {item.status === "uploading" && (
                <span className="text-blue-500 animate-pulse">⬆️</span>
              )}
              {item.status === "done" && (
                <span className="text-green-500">✅</span>
              )}
              {item.status === "error" && (
                <span className="text-red-500">❌</span>
              )}
            </span>
            <span className="truncate text-gray-600">{item.fileName}</span>
            {item.status === "error" && (
              <span className="text-red-400 text-xs ml-auto flex-shrink-0">{item.error}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
