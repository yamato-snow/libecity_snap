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
  const btnRef = useRef<HTMLButtonElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleBatchShareRef = useRef<() => void>(() => {});

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

  const tryWebShare = async (files: File[]): Promise<boolean> => {
    if (!navigator.share) return false;

    try {
      // iOS Safari/Chrome: files ONLY (no title/text)
      // canShare may not exist or may return false even if share works
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files });
        return true;
      }

      // canShare returned false or doesn't exist — try share anyway
      // Some iOS browsers support share but not canShare for files
      await navigator.share({ files });
      return true;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        // User cancelled — treat as success (don't fall through)
        return true;
      }
      // Share failed — fall through to other methods
      return false;
    }
  };

  const handleBatchShare = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setDownloading(true);
    setProgress({ current: 0, total: ids.length });

    try {
      const files = await fetchFiles(ids);

      if (files.length === 0) {
        alert("ダウンロードに失敗しました");
        return;
      }

      // 1. Try Web Share API (all files at once)
      if (await tryWebShare(files)) {
        onComplete?.();
        return;
      }

      // 2. Try Web Share API one file at a time (some browsers limit batch size)
      if (navigator.share && files.length > 1) {
        let sharedAny = false;
        for (const file of files) {
          try {
            await navigator.share({ files: [file] });
            sharedAny = true;
          } catch (e) {
            if (e instanceof Error && e.name === "AbortError") break;
          }
        }
        if (sharedAny) {
          onComplete?.();
          return;
        }
      }

      // 3. Mobile fallback: open images in new tabs (long-press to save)
      if (isMobileDevice()) {
        const selectedPhotos = photos.filter((p) => selectedIds.has(p.id));
        for (const photo of selectedPhotos) {
          window.open(photo.url, "_blank");
        }
        alert(
          "共有機能が利用できないため、画像を新しいタブで開きました。\n画像を長押しして「写真に追加」で保存してください。"
        );
        onComplete?.();
        return;
      }

      // 4. Desktop fallback: download files
      for (const file of files) {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
      onComplete?.();

      const failed = ids.length - files.length;
      if (failed > 0) {
        alert(`${files.length}枚を保存しました。${failed}枚は失敗しました。`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      alert("保存に失敗しました");
    } finally {
      setDownloading(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [selectedIds, photos, getAuthHeader, onComplete, fetchFiles]);

  handleBatchShareRef.current = handleBatchShare;

  // iOS Safari/Chrome: use native DOM event listener for user gesture propagation
  useEffect(() => {
    const btn = btnRef.current;
    const handler = (e: MouseEvent) => {
      e.stopPropagation();
      handleBatchShareRef.current();
    };
    btn?.addEventListener("click", handler);
    return () => btn?.removeEventListener("click", handler);
  }, []);

  const count = selectedIds.size;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 animate-fade-in">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {downloading
            ? `ダウンロード中... (${progress.current}/${progress.total})`
            : `${count}枚を選択中`}
        </span>
        <button
          ref={btnRef}
          disabled={downloading || count === 0}
          className="px-5 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium
                     hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     active:bg-emerald-700 flex items-center gap-2"
        >
          {downloading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              保存中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              写真に保存
            </>
          )}
        </button>
      </div>
    </div>
  );
}
