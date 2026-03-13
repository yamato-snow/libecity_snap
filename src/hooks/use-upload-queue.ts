"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { UploadQueueItem } from "@/types";
import { MAX_UPLOAD_CONCURRENCY, MAX_RETRY_COUNT, RETRY_BASE_DELAY } from "@/lib/constants";

interface UseUploadQueueOptions {
  getAuthHeader: () => Record<string, string>;
  sceneId: number;
  onUploadComplete?: () => void;
}

export function useUploadQueue({ getAuthHeader, sceneId, onUploadComplete }: UseUploadQueueOptions) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const queueRef = useRef<UploadQueueItem[]>([]);
  const activeCount = useRef(0);
  const processingRef = useRef(false);

  // Keep ref in sync with state
  const syncQueue = useCallback((updater: (prev: UploadQueueItem[]) => UploadQueueItem[]) => {
    queueRef.current = updater(queueRef.current);
    setQueue([...queueRef.current]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<UploadQueueItem>) => {
    syncQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, [syncQueue]);

  const processItem = useCallback(
    async (item: UploadQueueItem) => {
      try {
        // 1. Get presigned URL
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            sceneId,
            contentType: "image/jpeg",
            fileSize: item.file.size,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "アップロードに失敗しました");
        }

        const { uploadUrl } = await res.json();

        // 2. Upload to S3 via XHR for progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", "image/jpeg");
          xhr.timeout = 120000; // 2 minutes
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`S3アップロード失敗 (${xhr.status})`));
          };
          xhr.onerror = () =>
            reject(new Error("ネットワークエラー: S3への接続に失敗しました。CORS設定を確認してください。"));
          xhr.ontimeout = () =>
            reject(new Error("タイムアウト: アップロードに時間がかかりすぎました。"));
          xhr.send(item.file);
        });

        updateItem(item.id, { status: "done" });
        onUploadComplete?.();
      } catch (error) {
        const newRetryCount = item.retryCount + 1;
        if (newRetryCount >= MAX_RETRY_COUNT) {
          updateItem(item.id, {
            status: "error",
            retryCount: newRetryCount,
            error: error instanceof Error ? error.message : "アップロードに失敗しました",
          });
        } else {
          // Exponential backoff: 1s, 3s, 9s, 27s, 81s
          const delay = RETRY_BASE_DELAY * Math.pow(3, newRetryCount - 1);
          updateItem(item.id, { status: "pending", retryCount: newRetryCount });
          setTimeout(() => processQueue(), delay);
        }
      } finally {
        activeCount.current--;
        processQueue();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getAuthHeader, sceneId, updateItem, onUploadComplete]
  );

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;

    const pending = queueRef.current.filter((item) => item.status === "pending");
    const slots = MAX_UPLOAD_CONCURRENCY - activeCount.current;
    const batch = pending.slice(0, slots);

    if (batch.length > 0) {
      // Mark as uploading synchronously via ref
      syncQueue((prev) =>
        prev.map((item) =>
          batch.some((b) => b.id === item.id)
            ? { ...item, status: "uploading" as const }
            : item
        )
      );

      batch.forEach((item) => {
        activeCount.current++;
        processItem(item);
      });
    }

    processingRef.current = false;
  }, [processItem, syncQueue]);

  // Auto-resume when coming back online
  useEffect(() => {
    const handleOnline = () => processQueue();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [processQueue]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const heic2any = (await import("heic2any")).default;
      const newItems: UploadQueueItem[] = [];

      for (const file of files) {
        let blob: Blob = file;
        let fileName = file.name;

        // HEIC detection by MIME or extension
        const isHeic =
          file.type === "image/heic" ||
          file.type === "image/heif" ||
          /\.heic$/i.test(file.name) ||
          /\.heif$/i.test(file.name);

        if (isHeic) {
          try {
            const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            blob = Array.isArray(converted) ? converted[0] : converted;
            fileName = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
          } catch (e) {
            console.error("HEIC conversion failed:", e);
          }
        }

        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: blob,
          fileName,
          sceneId,
          status: "pending",
          retryCount: 0,
        });
      }

      syncQueue((prev) => [...prev, ...newItems]);
      setTimeout(processQueue, 0);
    },
    [sceneId, processQueue, syncQueue]
  );

  const clearCompleted = useCallback(() => {
    syncQueue((prev) => prev.filter((item) => item.status !== "done"));
  }, [syncQueue]);

  const stats = {
    total: queue.length,
    pending: queue.filter((i) => i.status === "pending").length,
    uploading: queue.filter((i) => i.status === "uploading").length,
    done: queue.filter((i) => i.status === "done").length,
    error: queue.filter((i) => i.status === "error").length,
  };

  return { queue, addFiles, clearCompleted, stats };
}
