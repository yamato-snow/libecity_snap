"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface PhotoUrl {
  id: string;
  url: string;
}

interface BatchShareButtonProps {
  selectedIds: Set<string>;
  photos: PhotoUrl[];
  getAuthHeader: () => Record<string, string>;
  onComplete?: () => void;
}

const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function BatchShareButton({
  selectedIds,
  photos,
  getAuthHeader,
  onComplete,
}: BatchShareButtonProps) {
  const shareBtnRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<"idle" | "fetching" | "ready">("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  // Store fetched files for the second tap
  const fetchedFilesRef = useRef<File[]>([]);

  const handleShareRef = useRef<() => void>(() => {});

  const fetchFiles = useCallback(
    async (ids: string[]): Promise<File[]> => {
      const CONCURRENCY = 3;
      const files: File[] = [];
      let completed = 0;

      for (let i = 0; i < ids.length; i += CONCURRENCY) {
        const batch = ids.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(async (id) => {
            const res = await fetch(`/api/photos/download?id=${id}`, {
              headers: getAuthHeader(),
            });
            if (!res.ok) throw new Error(`Failed: ${id}`);
            const blob = await res.blob();
            return new File([blob], `photo_${id}.jpg`, { type: blob.type });
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled") {
            files.push(result.value);
          }
          completed++;
          setProgress({ current: completed, total: ids.length });
        }
      }

      return files;
    },
    [getAuthHeader]
  );

  // Step 1: Fetch all photos (triggered by first button tap)
  const handleFetch = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setPhase("fetching");
    setProgress({ current: 0, total: ids.length });

    try {
      const files = await fetchFiles(ids);
      if (files.length === 0) {
        alert("ダウンロードに失敗しました");
        setPhase("idle");
        return;
      }
      fetchedFilesRef.current = files;
      // Show the "share" button for a fresh user gesture
      setPhase("ready");
    } catch {
      alert("ダウンロードに失敗しました");
      setPhase("idle");
    }
  }, [selectedIds, fetchFiles]);

  // Step 2: Share via Web Share API (triggered by SECOND button tap = fresh user gesture)
  const handleShare = useCallback(async () => {
    const files = fetchedFilesRef.current;
    if (files.length === 0) return;

    try {
      // Try Web Share API (files ONLY for iOS Safari compatibility)
      if (navigator.share) {
        const canShare = navigator.canShare?.({ files }) ?? false;
        if (canShare) {
          await navigator.share({ files });
          fetchedFilesRef.current = [];
          setPhase("idle");
          onComplete?.();
          return;
        }
        // canShare not available or returned false — still try
        try {
          await navigator.share({ files });
          fetchedFilesRef.current = [];
          setPhase("idle");
          onComplete?.();
          return;
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") {
            setPhase("idle");
            return;
          }
          // Fall through to other methods
        }
      }

      // Mobile fallback: open images in new tabs
      if (isMobileDevice()) {
        const selectedPhotos = photos.filter((p) => selectedIds.has(p.id));
        for (const photo of selectedPhotos) {
          window.open(photo.url, "_blank");
        }
        alert(
          "共有機能が利用できないため、画像を新しいタブで開きました。\n画像を長押しして「写真に追加」で保存してください。"
        );
      } else {
        // Desktop fallback: download files
        for (const file of files) {
          const url = URL.createObjectURL(file);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      }

      fetchedFilesRef.current = [];
      setPhase("idle");
      onComplete?.();
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setPhase("idle");
        return;
      }
      alert("保存に失敗しました");
      setPhase("idle");
    }
  }, [selectedIds, photos, onComplete]);

  handleShareRef.current = handleShare;

  // Native DOM event listener for the share button (fresh user gesture for navigator.share)
  useEffect(() => {
    const btn = shareBtnRef.current;
    const handler = (e: MouseEvent) => {
      e.stopPropagation();
      handleShareRef.current();
    };
    btn?.addEventListener("click", handler);
    return () => btn?.removeEventListener("click", handler);
  }, []);

  const count = selectedIds.size;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 animate-fade-in">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {phase === "fetching"
            ? `準備中... (${progress.current}/${progress.total})`
            : phase === "ready"
              ? `${fetchedFilesRef.current.length}枚の準備完了`
              : `${count}枚を選択中`}
        </span>

        {phase === "idle" && (
          <button
            onClick={handleFetch}
            disabled={count === 0}
            className="px-5 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium
                       hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       active:bg-emerald-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            写真に保存
          </button>
        )}

        {phase === "fetching" && (
          <button
            disabled
            className="px-5 py-2 bg-gray-300 text-white rounded-full text-sm font-medium
                       flex items-center gap-2 cursor-not-allowed"
          >
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            準備中...
          </button>
        )}

        {phase === "ready" && (
          <button
            ref={shareBtnRef}
            className="px-5 py-2 bg-blue-500 text-white rounded-full text-sm font-medium
                       hover:bg-blue-600 transition-colors active:bg-blue-700
                       flex items-center gap-2 animate-pulse"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            タップして共有
          </button>
        )}
      </div>
    </div>
  );
}
