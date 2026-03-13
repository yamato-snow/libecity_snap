"use client";

import { useState, useEffect, useCallback } from "react";
import { PinInput } from "@/components/pin-input";
import Link from "next/link";

interface SceneItem {
  id: number;
  name: string;
  count: number;
}

interface Stats {
  totalPhotos: number;
  totalGuests: number;
  sceneStats: SceneItem[];
}

interface PhotoItem {
  id: string;
  fileName: string;
  url: string;
  guestName?: string;
  sceneName?: string;
}

interface GuestItem {
  id: number;
  nickname: string;
  createdAt: string;
  _count: { photos: number };
}

interface InviteeItem {
  id: number;
  name: string;
  createdAt: string;
  guests: { id: number; nickname: string }[];
}

type Tab = "stats" | "photos" | "guests" | "invitees";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [newSceneName, setNewSceneName] = useState("");
  const [confirmDeleteSceneId, setConfirmDeleteSceneId] = useState<number | null>(null);
  const [deletingSceneId, setDeletingSceneId] = useState<number | null>(null);

  // Photos tab state
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState<string | null>(null);
  const [selectModePhotos, setSelectModePhotos] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [bulkDeletingPhotos, setBulkDeletingPhotos] = useState(false);
  const [bulkDeletePhotosProgress, setBulkDeletePhotosProgress] = useState("");
  const [confirmBulkDeletePhotos, setConfirmBulkDeletePhotos] = useState(false);

  // Invitees tab state
  const [invitees, setInvitees] = useState<InviteeItem[]>([]);
  const [inviteesLoading, setInviteesLoading] = useState(false);
  const [newInviteeName, setNewInviteeName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [confirmDeleteInviteeId, setConfirmDeleteInviteeId] = useState<number | null>(null);
  const [deletingInviteeId, setDeletingInviteeId] = useState<number | null>(null);

  // Guests tab state
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [deletingGuestId, setDeletingGuestId] = useState<number | null>(null);
  const [confirmDeleteGuestId, setConfirmDeleteGuestId] = useState<number | null>(null);
  const [selectModeGuests, setSelectModeGuests] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<number>>(new Set());
  const [bulkDeletingGuests, setBulkDeletingGuests] = useState(false);
  const [bulkDeleteGuestsProgress, setBulkDeleteGuestsProgress] = useState("");
  const [confirmBulkDeleteGuests, setConfirmBulkDeleteGuests] = useState(false);

  const getAuthHeader = useCallback(() => {
    return {
      Authorization: `Bearer ${btoa(JSON.stringify({ pin: adminPin }))}`,
    };
  }, [adminPin]);

  const fetchStats = useCallback(async () => {
    try {
      const [, guestsRes, scenesRes] = await Promise.all([
        fetch("/api/photos?limit=1", { headers: getAuthHeader() }),
        fetch("/api/guests", { headers: getAuthHeader() }),
        fetch("/api/scenes", { headers: getAuthHeader() }),
      ]);

      const allPhotosRes = await fetch("/api/photos?limit=10000", {
        headers: getAuthHeader(),
      });

      const photosData = allPhotosRes.ok ? await allPhotosRes.json() : { photos: [] };
      const guestsData = guestsRes.ok ? await guestsRes.json() : { guests: [] };
      const scenesData = scenesRes.ok ? await scenesRes.json() : { scenes: [] };

      const sceneCounts: Record<string, number> = {};
      for (const photo of photosData.photos) {
        const sceneName = photo.scene?.name || "不明";
        sceneCounts[sceneName] = (sceneCounts[sceneName] || 0) + 1;
      }

      setStats({
        totalPhotos: photosData.photos.length,
        totalGuests: guestsData.guests.length,
        sceneStats: scenesData.scenes.map((s: { id: number; name: string }) => ({
          id: s.id,
          name: s.name,
          count: sceneCounts[s.name] || 0,
        })),
      });
    } catch {
      // Silently fail
    }
  }, [getAuthHeader]);

  const fetchPhotos = useCallback(async () => {
    setPhotosLoading(true);
    try {
      const res = await fetch("/api/admin/download", { headers: getAuthHeader() });
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(
        data.photos.map((p: { id: string; fileName: string; url: string }) => {
          const parts = p.fileName.replace(/\.jpg$/, "").split("_");
          return {
            ...p,
            sceneName: parts[0] || "",
            guestName: parts[1] || "",
          };
        })
      );
    } catch {
      // Silently fail
    } finally {
      setPhotosLoading(false);
    }
  }, [getAuthHeader]);

  const fetchGuests = useCallback(async () => {
    setGuestsLoading(true);
    try {
      const res = await fetch("/api/admin/guests", { headers: getAuthHeader() });
      if (!res.ok) return;
      const data = await res.json();
      setGuests(data.guests);
    } catch {
      // Silently fail
    } finally {
      setGuestsLoading(false);
    }
  }, [getAuthHeader]);

  const fetchInvitees = useCallback(async () => {
    setInviteesLoading(true);
    try {
      const res = await fetch("/api/invitees", { headers: getAuthHeader() });
      if (!res.ok) return;
      const data = await res.json();
      setInvitees(data.invitees);
    } catch {
      // Silently fail
    } finally {
      setInviteesLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    if (!authenticated) return;
    fetchStats();
  }, [authenticated, fetchStats]);

  useEffect(() => {
    if (!authenticated) return;
    if (activeTab === "photos" && photos.length === 0) fetchPhotos();
    if (activeTab === "guests" && guests.length === 0) fetchGuests();
    if (activeTab === "invitees" && invitees.length === 0) fetchInvitees();
  }, [authenticated, activeTab, photos.length, guests.length, invitees.length, fetchPhotos, fetchGuests, fetchInvitees]);

  const handlePinSubmit = async (pin: string) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    const data = await res.json();
    if (data.role !== "admin") {
      throw new Error("管理者PINを入力してください");
    }
    setAdminPin(pin);
    setAuthenticated(true);
  };

  const handleAddInvitee = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newInviteeName.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/invitees", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setNewInviteeName("");
        fetchInvitees();
      }
    } catch {
      // Silently fail
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch("/api/invitees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ csv: csvText }),
      });
      if (res.ok) {
        const data = await res.json();
        setCsvText("");
        alert(`${data.imported}名を登録しました`);
        fetchInvitees();
      }
    } catch {
      // Silently fail
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteInvitee = async (id: number) => {
    setDeletingInviteeId(id);
    try {
      const res = await fetch(`/api/invitees/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (res.ok) {
        fetchInvitees();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingInviteeId(null);
      setConfirmDeleteInviteeId(null);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadProgress("写真一覧を取得中...");

    try {
      const res = await fetch("/api/admin/download", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("ダウンロード情報の取得に失敗しました");

      const { photos } = await res.json();
      if (photos.length === 0) {
        alert("ダウンロードする写真がありません");
        return;
      }

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (let i = 0; i < photos.length; i++) {
        setDownloadProgress(`写真をダウンロード中... (${i + 1}/${photos.length})`);
        const photoRes = await fetch(photos[i].url);
        const blob = await photoRes.blob();
        zip.file(photos[i].fileName, blob);
      }

      setDownloadProgress("ZIPファイルを生成中...");
      const zipBlob = await zip.generateAsync({ type: "blob" });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "libecity-snap-photos.zip";
      a.click();
      URL.revokeObjectURL(url);
      setDownloadProgress("ダウンロード完了！");
    } catch (e) {
      setDownloadProgress("");
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setDownloading(false);
    }
  };

  const handleAddScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSceneName.trim()) return;

    try {
      const res = await fetch("/api/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ name: newSceneName.trim() }),
      });
      if (res.ok) {
        setNewSceneName("");
        fetchStats();
      }
    } catch {
      alert("シーンの追加に失敗しました");
    }
  };

  const handleDeleteScene = async (sceneId: number) => {
    setDeletingSceneId(sceneId);
    try {
      const res = await fetch(`/api/scenes/${sceneId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
        return;
      }
      setConfirmDeleteSceneId(null);
      fetchStats();
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeletingSceneId(null);
    }
  };

  // --- Single delete handlers ---

  const handleDeletePhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(`/api/admin/photos/${photoId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
        return;
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setConfirmDeletePhotoId(null);
      fetchStats();
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleDeleteGuest = async (guestId: number) => {
    setDeletingGuestId(guestId);
    try {
      const res = await fetch(`/api/admin/guests/${guestId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
        return;
      }
      setGuests((prev) => prev.filter((g) => g.id !== guestId));
      setConfirmDeleteGuestId(null);
      setPhotos([]);
      fetchStats();
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeletingGuestId(null);
    }
  };

  // --- Photo selection ---

  const togglePhotoSelection = (id: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPhotos = () => {
    if (selectedPhotoIds.size === photos.length) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(photos.map((p) => p.id)));
    }
  };

  const exitPhotoSelectMode = () => {
    setSelectModePhotos(false);
    setSelectedPhotoIds(new Set());
    setConfirmBulkDeletePhotos(false);
  };

  const handleBulkDeletePhotos = async () => {
    const ids = Array.from(selectedPhotoIds);
    setBulkDeletingPhotos(true);
    let deleted = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      setBulkDeletePhotosProgress(`削除中... (${i + 1}/${ids.length})`);
      try {
        const res = await fetch(`/api/admin/photos/${ids[i]}`, {
          method: "DELETE",
          headers: getAuthHeader(),
        });
        if (res.ok) {
          deleted++;
          setPhotos((prev) => prev.filter((p) => p.id !== ids[i]));
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setBulkDeletingPhotos(false);
    setBulkDeletePhotosProgress("");
    setConfirmBulkDeletePhotos(false);
    setSelectedPhotoIds(new Set());
    setSelectModePhotos(false);
    fetchStats();

    if (failed > 0) {
      alert(`${deleted}枚を削除しました。${failed}枚は失敗しました。`);
    }
  };

  // --- Guest selection ---

  const toggleGuestSelection = (id: number) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllGuests = () => {
    if (selectedGuestIds.size === guests.length) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(guests.map((g) => g.id)));
    }
  };

  const exitGuestSelectMode = () => {
    setSelectModeGuests(false);
    setSelectedGuestIds(new Set());
    setConfirmBulkDeleteGuests(false);
  };

  const selectedGuestsPhotoCount = guests
    .filter((g) => selectedGuestIds.has(g.id))
    .reduce((sum, g) => sum + g._count.photos, 0);

  const handleBulkDeleteGuests = async () => {
    const ids = Array.from(selectedGuestIds);
    setBulkDeletingGuests(true);
    let deleted = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      setBulkDeleteGuestsProgress(`削除中... (${i + 1}/${ids.length})`);
      try {
        const res = await fetch(`/api/admin/guests/${ids[i]}`, {
          method: "DELETE",
          headers: getAuthHeader(),
        });
        if (res.ok) {
          deleted++;
          setGuests((prev) => prev.filter((g) => g.id !== ids[i]));
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setBulkDeletingGuests(false);
    setBulkDeleteGuestsProgress("");
    setConfirmBulkDeleteGuests(false);
    setSelectedGuestIds(new Set());
    setSelectModeGuests(false);
    setPhotos([]);
    fetchStats();

    if (failed > 0) {
      alert(`${deleted}名を削除しました。${failed}名は失敗しました。`);
    }
  };

  // --- Render ---

  if (!authenticated) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-6">
        <p className="text-sm text-gray-500 mb-4">管理者PINを入力</p>
        <PinInput onSubmit={handlePinSubmit} />
      </main>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "stats", label: "統計" },
    { key: "photos", label: "写真管理" },
    { key: "guests", label: "ゲスト管理" },
    { key: "invitees", label: "参加者" },
  ];

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">管理画面</h1>
          <Link href="/" className="text-sm text-emerald-500 hover:underline">
            トップに戻る
          </Link>
        </div>
      </header>

      {/* Tab bar */}
      <div className="sticky top-[53px] z-10 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 flex flex-col gap-6 pb-24">
        {/* Stats tab */}
        {activeTab === "stats" && (
          <>
            {stats && (
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-bold text-gray-800 mb-4">統計</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <div className="text-3xl font-bold text-emerald-500">{stats.totalPhotos}</div>
                    <div className="text-sm text-gray-600">写真</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-500">{stats.totalGuests}</div>
                    <div className="text-sm text-gray-600">ゲスト</div>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">シーン別</h3>
                <div className="space-y-2">
                  {stats.sceneStats.map((scene) => (
                    <div key={scene.name} className="flex justify-between text-sm">
                      <span className="text-gray-700">{scene.name}</span>
                      <span className="font-medium text-gray-900">{scene.count}枚</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-4">シーン管理</h2>

              {/* Scene list */}
              {stats && stats.sceneStats.length > 0 && (
                <div className="space-y-2 mb-4">
                  {stats.sceneStats.map((scene) => (
                    <div
                      key={scene.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-800">{scene.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{scene.count}枚</span>
                      </div>
                      {confirmDeleteSceneId === scene.id ? (
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {scene.count > 0 && (
                            <span className="text-xs text-amber-600 max-w-[140px] text-right">
                              写真あり：削除不可
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteScene(scene.id)}
                            disabled={deletingSceneId === scene.id || scene.count > 0}
                            className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg
                                       hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            {deletingSceneId === scene.id ? (
                              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              "削除する"
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSceneId(null)}
                            className="px-3 py-1.5 bg-gray-400 text-white text-xs font-medium rounded-lg
                                       hover:bg-gray-500 transition-colors"
                          >
                            戻る
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteSceneId(scene.id)}
                          className="ml-3 shrink-0 px-3 py-1.5 bg-red-100 text-red-600 text-xs font-medium
                                     rounded-lg hover:bg-red-200 transition-colors"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add scene form */}
              <form onSubmit={handleAddScene} className="flex gap-2">
                <input
                  type="text"
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  placeholder="新しいシーン名"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-xl
                             hover:bg-emerald-600 transition-colors"
                >
                  追加
                </button>
              </form>
            </section>

            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-4">一括ダウンロード</h2>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-3 bg-gray-800 text-white font-medium rounded-xl
                           hover:bg-gray-900 disabled:opacity-50 transition-colors"
              >
                {downloading ? downloadProgress : "全写真をZIPでダウンロード"}
              </button>
            </section>
          </>
        )}

        {/* Photos tab */}
        {activeTab === "photos" && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">写真管理</h2>
              {photos.length > 0 && (
                selectModePhotos ? (
                  <button
                    onClick={exitPhotoSelectMode}
                    className="text-sm text-gray-500 font-medium hover:text-gray-700 transition-colors"
                  >
                    キャンセル
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectModePhotos(true)}
                    className="text-sm text-emerald-500 font-medium hover:text-emerald-600 transition-colors"
                  >
                    選択
                  </button>
                )
              )}
            </div>

            {/* Select all toggle */}
            {selectModePhotos && photos.length > 0 && (
              <button
                onClick={toggleSelectAllPhotos}
                className="mb-3 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedPhotoIds.size === photos.length
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-gray-300"
                }`}>
                  {selectedPhotoIds.size === photos.length && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                すべて選択 ({selectedPhotoIds.size}/{photos.length})
              </button>
            )}

            {photosLoading ? (
              <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>
            ) : photos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">写真がありません</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative group ${selectModePhotos ? "cursor-pointer" : ""}`}
                    onClick={selectModePhotos ? () => togglePhotoSelection(photo.id) : undefined}
                  >
                    <div className={`aspect-square rounded-xl overflow-hidden bg-gray-100 transition-all ${
                      selectModePhotos && selectedPhotoIds.has(photo.id)
                        ? "ring-3 ring-emerald-500 ring-offset-2"
                        : ""
                    }`}>
                      <img
                        src={photo.url}
                        alt=""
                        className={`w-full h-full object-cover transition-opacity ${
                          selectModePhotos && selectedPhotoIds.has(photo.id) ? "opacity-80" : ""
                        }`}
                      />
                    </div>

                    {/* Selection checkbox overlay */}
                    {selectModePhotos && (
                      <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedPhotoIds.has(photo.id)
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-white/80 border-gray-300"
                      }`}>
                        {selectedPhotoIds.has(photo.id) && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}

                    <div className="mt-1 px-1">
                      <p className="text-xs text-gray-600 truncate">{photo.guestName}</p>
                      <p className="text-xs text-gray-400 truncate">{photo.sceneName}</p>
                    </div>

                    {/* Single delete (only in non-select mode) */}
                    {!selectModePhotos && (
                      confirmDeletePhotoId === photo.id ? (
                        <div className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center gap-2 p-2">
                          <p className="text-white text-xs text-center">この写真を削除しますか？</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeletePhoto(photo.id)}
                              disabled={deletingPhotoId === photo.id}
                              className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg
                                         hover:bg-red-600 disabled:opacity-50 transition-colors"
                            >
                              {deletingPhotoId === photo.id ? (
                                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                "削除する"
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmDeletePhotoId(null)}
                              className="px-3 py-1.5 bg-gray-500 text-white text-xs font-medium rounded-lg
                                         hover:bg-gray-600 transition-colors"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeletePhotoId(photo.id)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 text-white rounded-full
                                     flex items-center justify-center opacity-0 group-hover:opacity-100
                                     hover:bg-red-600 transition-all"
                          title="削除"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Guests tab */}
        {activeTab === "guests" && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">ゲスト管理</h2>
              {guests.length > 0 && (
                selectModeGuests ? (
                  <button
                    onClick={exitGuestSelectMode}
                    className="text-sm text-gray-500 font-medium hover:text-gray-700 transition-colors"
                  >
                    キャンセル
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectModeGuests(true)}
                    className="text-sm text-emerald-500 font-medium hover:text-emerald-600 transition-colors"
                  >
                    選択
                  </button>
                )
              )}
            </div>

            {/* Select all toggle */}
            {selectModeGuests && guests.length > 0 && (
              <button
                onClick={toggleSelectAllGuests}
                className="mb-3 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedGuestIds.size === guests.length
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-gray-300"
                }`}>
                  {selectedGuestIds.size === guests.length && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                すべて選択 ({selectedGuestIds.size}/{guests.length})
              </button>
            )}

            {guestsLoading ? (
              <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>
            ) : guests.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">ゲストがいません</p>
            ) : (
              <div className="space-y-3">
                {guests.map((guest) => (
                  <div
                    key={guest.id}
                    className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                      selectModeGuests && selectedGuestIds.has(guest.id)
                        ? "bg-emerald-50 ring-2 ring-emerald-500"
                        : "bg-gray-50"
                    } ${selectModeGuests ? "cursor-pointer" : ""}`}
                    onClick={selectModeGuests ? () => toggleGuestSelection(guest.id) : undefined}
                  >
                    {/* Selection checkbox */}
                    {selectModeGuests && (
                      <div className={`mr-3 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedGuestIds.has(guest.id)
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-gray-300"
                      }`}>
                        {selectedGuestIds.has(guest.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{guest.nickname}</p>
                      <p className="text-xs text-gray-500">
                        {guest._count.photos}枚 ・ {new Date(guest.createdAt).toLocaleDateString("ja-JP")}
                      </p>
                    </div>

                    {/* Single delete (only in non-select mode) */}
                    {!selectModeGuests && (
                      confirmDeleteGuestId === guest.id ? (
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <span className="text-xs text-red-600 max-w-[140px] text-right">
                            {guest.nickname}と{guest._count.photos}枚の写真を削除？
                          </span>
                          <button
                            onClick={() => handleDeleteGuest(guest.id)}
                            disabled={deletingGuestId === guest.id}
                            className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg
                                       hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            {deletingGuestId === guest.id ? (
                              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              "削除する"
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteGuestId(null)}
                            className="px-3 py-1.5 bg-gray-400 text-white text-xs font-medium rounded-lg
                                       hover:bg-gray-500 transition-colors"
                          >
                            戻る
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteGuestId(guest.id)}
                          className="ml-3 shrink-0 px-3 py-1.5 bg-red-100 text-red-600 text-xs font-medium
                                     rounded-lg hover:bg-red-200 transition-colors"
                        >
                          削除
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Invitees tab */}
        {activeTab === "invitees" && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">参加者管理</h2>

            {inviteesLoading ? (
              <p className="text-sm text-gray-500 text-center py-8">読み込み中...</p>
            ) : (
              <>
                {/* Add single invitee */}
                <form onSubmit={handleAddInvitee} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={newInviteeName}
                    onChange={(e) => setNewInviteeName(e.target.value)}
                    placeholder="参加者の名前（フルネーム）"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-xl
                               hover:bg-emerald-600 transition-colors"
                  >
                    追加
                  </button>
                </form>

                {/* CSV import */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">一括登録（1行に1名）</h3>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder={"山田太郎\n佐藤花子\n田中一郎"}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none mb-2"
                  />
                  <button
                    onClick={handleImportCsv}
                    disabled={importing || !csvText.trim()}
                    className="w-full py-2 bg-gray-800 text-white text-sm font-medium rounded-xl
                               hover:bg-gray-900 disabled:opacity-50 transition-colors"
                  >
                    {importing ? "登録中..." : "一括登録"}
                  </button>
                </div>

                {/* Invitee list */}
                {invitees.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">参加者がいません</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-gray-400 mb-1">計 {invitees.length}名</p>
                    {invitees.map((invitee) => (
                      <div
                        key={invitee.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-800">{invitee.name}</span>
                          {invitee.guests.length > 0 && (
                            <span className="ml-2 text-xs text-emerald-500">
                              ({invitee.guests.map((g) => g.nickname).join(", ")})
                            </span>
                          )}
                        </div>
                        {confirmDeleteInviteeId === invitee.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteInvitee(invitee.id)}
                              disabled={deletingInviteeId === invitee.id}
                              className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg
                                         hover:bg-red-600 disabled:opacity-50 transition-colors"
                            >
                              {deletingInviteeId === invitee.id ? "削除中..." : "確定"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteInviteeId(null)}
                              className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-lg
                                         hover:bg-gray-300 transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteInviteeId(invitee.id)}
                            className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-medium
                                       rounded-lg hover:bg-red-200 transition-colors"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {/* Bulk delete bottom bar - Photos */}
      {selectModePhotos && selectedPhotoIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
          <div className="bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-lg">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {selectedPhotoIds.size}枚を選択中
              </span>
              <button
                onClick={() => setConfirmBulkDeletePhotos(true)}
                className="px-5 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl
                           hover:bg-red-600 active:scale-95 transition-all
                           shadow-sm shadow-red-500/25"
              >
                一括削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete bottom bar - Guests */}
      {selectModeGuests && selectedGuestIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
          <div className="bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-lg">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {selectedGuestIds.size}名を選択中
              </span>
              <button
                onClick={() => setConfirmBulkDeleteGuests(true)}
                className="px-5 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl
                           hover:bg-red-600 active:scale-95 transition-all
                           shadow-sm shadow-red-500/25"
              >
                一括削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation sheet - Photos */}
      {confirmBulkDeletePhotos && (
        <div className="fixed inset-0 z-50 animate-fade-in" onClick={() => !bulkDeletingPhotos && setConfirmBulkDeletePhotos(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-8 pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">写真を一括削除</h3>
              <p className="text-sm text-gray-500 mt-2">
                選択した <span className="font-bold text-red-500">{selectedPhotoIds.size}枚</span> の写真を削除します。<br />
                この操作は取り消せません。
              </p>
            </div>

            {bulkDeletingPhotos ? (
              <div className="text-center py-2">
                <span className="inline-block w-5 h-5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin mb-2" />
                <p className="text-sm text-gray-600">{bulkDeletePhotosProgress}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleBulkDeletePhotos}
                  className="w-full py-3.5 bg-red-500 text-white font-medium rounded-2xl
                             hover:bg-red-600 active:scale-[0.98] transition-all"
                >
                  {selectedPhotoIds.size}枚を削除する
                </button>
                <button
                  onClick={() => setConfirmBulkDeletePhotos(false)}
                  className="w-full py-3 text-gray-500 font-medium rounded-2xl
                             hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk delete confirmation sheet - Guests */}
      {confirmBulkDeleteGuests && (
        <div className="fixed inset-0 z-50 animate-fade-in" onClick={() => !bulkDeletingGuests && setConfirmBulkDeleteGuests(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-8 pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">ゲストを一括削除</h3>
              <p className="text-sm text-gray-500 mt-2">
                選択した <span className="font-bold text-red-500">{selectedGuestIds.size}名</span> のゲストと<br />
                関連する <span className="font-bold text-red-500">{selectedGuestsPhotoCount}枚</span> の写真を全て削除します。<br />
                この操作は取り消せません。
              </p>
            </div>

            {bulkDeletingGuests ? (
              <div className="text-center py-2">
                <span className="inline-block w-5 h-5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin mb-2" />
                <p className="text-sm text-gray-600">{bulkDeleteGuestsProgress}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleBulkDeleteGuests}
                  className="w-full py-3.5 bg-red-500 text-white font-medium rounded-2xl
                             hover:bg-red-600 active:scale-[0.98] transition-all"
                >
                  {selectedGuestIds.size}名を削除する
                </button>
                <button
                  onClick={() => setConfirmBulkDeleteGuests(false)}
                  className="w-full py-3 text-gray-500 font-medium rounded-2xl
                             hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
