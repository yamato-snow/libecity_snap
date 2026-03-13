"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/hooks/use-session";
import { AppShell } from "@/components/app-shell";
import { FilterBar } from "@/components/filter-bar";
import { PhotoGrid } from "@/components/photo-grid";
import { PhotoModal } from "@/components/photo-modal";
import type { Scene, Guest } from "@/types";
import Link from "next/link";

interface PhotoItem {
  id: string;
  url: string;
  guest?: { nickname: string };
  scene?: { name: string };
  uploadedAt?: string;
}

export default function AlbumPage() {
  const { session, loading, getAuthHeader } = useSession();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchPhotos = useCallback(
    async (cursor?: string | null, reset = false) => {
      setLoadingPhotos(true);
      try {
        const params = new URLSearchParams();
        if (cursor) params.set("cursor", cursor);
        if (selectedSceneId) params.set("sceneId", String(selectedSceneId));
        if (selectedGuestId) params.set("guestId", String(selectedGuestId));

        const res = await fetch(`/api/photos?${params}`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          setPhotos((prev) => (reset ? data.photos : [...prev, ...data.photos]));
          setNextCursor(data.nextCursor);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoadingPhotos(false);
      }
    },
    [selectedSceneId, selectedGuestId, getAuthHeader]
  );

  // Fetch initial data
  useEffect(() => {
    if (loading || !session) return;
    const fetchMeta = async () => {
      const [scenesRes, guestsRes] = await Promise.all([
        fetch("/api/scenes", { headers: getAuthHeader() }),
        fetch("/api/guests", { headers: getAuthHeader() }),
      ]);
      if (scenesRes.ok) {
        const data = await scenesRes.json();
        setScenes(data.scenes);
      }
      if (guestsRes.ok) {
        const data = await guestsRes.json();
        setGuests(data.guests);
      }
    };
    fetchMeta();
  }, [loading, session, getAuthHeader]);

  // Refetch photos when filters change
  useEffect(() => {
    if (loading || !session) return;
    fetchPhotos(null, true);
  }, [loading, session, fetchPhotos]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current || !nextCursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingPhotos) {
          fetchPhotos(nextCursor);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingPhotos, fetchPhotos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 p-6">
        <p className="text-gray-600">ログインが必要です</p>
        <Link href="/" className="text-emerald-500 font-medium hover:underline">
          トップに戻る
        </Link>
      </div>
    );
  }

  const hasActiveFilters = selectedSceneId !== null || selectedGuestId !== null;

  return (
    <AppShell activeTab="album">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">共有アルバム</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              hasActiveFilters || showFilters
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            フィルター
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full p-4 flex flex-col gap-4">
        {/* Collapsible filter bar */}
        {showFilters && (
          <div className="animate-fade-in">
            <FilterBar
              scenes={scenes}
              guests={guests}
              selectedSceneId={selectedSceneId}
              selectedGuestId={selectedGuestId}
              onSceneChange={(id) => setSelectedSceneId(id)}
              onGuestChange={(id) => setSelectedGuestId(id)}
            />
          </div>
        )}

        <PhotoGrid photos={photos} onPhotoClick={setSelectedPhoto} />

        {/* Infinite scroll sentinel */}
        <div ref={observerRef} className="h-4" />
        {loadingPhotos && (
          <div className="text-center py-4 text-gray-400 animate-pulse">
            読み込み中...
          </div>
        )}
      </div>

      {selectedPhoto && (
        <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </AppShell>
  );
}
