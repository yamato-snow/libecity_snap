"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { toast } from "sonner";

interface PhotoModalProps {
  photo: {
    id: string;
    url: string;
    guest?: { nickname: string };
    scene?: { name: string };
    uploadedAt?: string;
  };
  onClose: () => void;
  getAuthHeader?: () => Record<string, string>;
}

export function PhotoModal({ photo, onClose, getAuthHeader }: PhotoModalProps) {
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const shareBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "success">("idle");

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // handleDownload を ref に保持（ネイティブイベントリスナーから参照するため）
  const handleDownloadRef = useRef<() => void>(() => {});
  handleDownloadRef.current = async () => {
    if (downloadState !== "idle") return;
    const filename = `${photo.scene?.name || "photo"}_${photo.guest?.nickname || "guest"}_${photo.id}.jpg`;

    setDownloadState("downloading");
    try {
      // サーバー側プロキシ経由でダウンロード（S3 CORSの問題を回避）
      const res = await fetch(`/api/photos/download?id=${photo.id}`, {
        headers: getAuthHeader?.() || {},
      });
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();

      // モバイル: Web Share API でネイティブ共有シートを表示
      if (navigator.share) {
        const file = new File([blob], filename, { type: blob.type });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] });
          setDownloadState("success");
          toast.success("共有しました");
          setTimeout(() => setDownloadState("idle"), 2000);
          return;
        }
      }

      // モバイル: 画像を新タブで直接表示（長押しで「写真に追加」が可能）
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.open(photo.url, "_blank");
        setDownloadState("success");
        toast.success("画像を開きました — 長押しで保存できます");
        setTimeout(() => setDownloadState("idle"), 2000);
        return;
      }

      // デスクトップ: 従来のダウンロード
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadState("success");
      toast.success("ダウンロードしました");
      setTimeout(() => setDownloadState("idle"), 2000);
    } catch (e) {
      // ユーザーが共有をキャンセルした場合はエラーにしない
      if (e instanceof Error && e.name === "AbortError") {
        setDownloadState("idle");
        return;
      }
      setDownloadState("idle");
      toast.error("ダウンロードに失敗しました");
    }
  };

  // iOS Safari 対策: ネイティブ DOM イベントリスナーを使用
  // React の合成イベントは iOS Safari でバブリングしないことがある (React #11918, #25308)
  useEffect(() => {
    const overlay = overlayRef.current;
    const shareBtn = shareBtnRef.current;
    const closeBtn = closeBtnRef.current;

    const handleOverlayClick = (e: MouseEvent) => {
      if (e.target === overlay) onClose();
    };
    const handleShareClick = (e: MouseEvent) => {
      e.stopPropagation();
      handleDownloadRef.current();
    };
    const handleCloseClick = (e: MouseEvent) => {
      e.stopPropagation();
      onClose();
    };

    overlay?.addEventListener("click", handleOverlayClick);
    shareBtn?.addEventListener("click", handleShareClick);
    closeBtn?.addEventListener("click", handleCloseClick);

    return () => {
      overlay?.removeEventListener("click", handleOverlayClick);
      shareBtn?.removeEventListener("click", handleShareClick);
      closeBtn?.removeEventListener("click", handleCloseClick);
    };
  }, [onClose]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0 && contentRef.current) {
      contentRef.current.style.transform = `translateY(${diff}px)`;
      contentRef.current.style.opacity = String(1 - diff / 300);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startY.current !== null && currentY.current !== null) {
      const diff = currentY.current - startY.current;
      if (diff > 100) {
        onClose();
        return;
      }
    }
    if (contentRef.current) {
      contentRef.current.style.transform = "";
      contentRef.current.style.opacity = "";
    }
    startY.current = null;
    currentY.current = null;
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in cursor-pointer"
    >
      <div
        ref={contentRef}
        className="relative max-w-full max-h-full flex flex-col items-center gap-3 transition-[transform,opacity] duration-200 cursor-default"
      >
        {/* Close button */}
        <button
          ref={closeBtnRef}
          className="absolute -top-2 -right-2 z-10 w-10 h-10 bg-white rounded-full
                     flex items-center justify-center shadow-lg text-gray-600 hover:text-gray-800"
          aria-label="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Photo - スワイプ閉じは画像エリアのみ */}
        <div
          className="relative w-full max-h-[70vh] flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={`Photo by ${photo.guest?.nickname || "guest"}`}
            className="max-h-[70vh] max-w-full w-auto object-contain rounded-lg"
            style={{ WebkitUserSelect: "auto", WebkitTouchCallout: "default" } as React.CSSProperties}
          />
        </div>

        {/* Info */}
        <div className="text-center text-white text-sm">
          <p>
            {photo.guest?.nickname} / {photo.scene?.name}
          </p>
        </div>

        {/* Download / Share button */}
        <button
          ref={shareBtnRef}
          disabled={downloadState === "downloading"}
          className={`px-6 py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer
            ${downloadState === "success"
              ? "bg-emerald-500 text-white"
              : downloadState === "downloading"
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-white text-gray-800 hover:bg-gray-100 active:bg-gray-200"
            }`}
        >
          {downloadState === "downloading" && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {downloadState === "success" && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {downloadState === "downloading"
            ? "処理中..."
            : downloadState === "success"
              ? "保存しました"
              : isMobile ? "共有" : "ダウンロード"}
        </button>
        {isMobile && downloadState === "idle" && (
          <p className="text-white/60 text-xs">
            画像を長押しで写真に保存できます
          </p>
        )}
      </div>
    </div>
  );
}
