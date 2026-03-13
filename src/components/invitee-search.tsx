"use client";

import { useState, useEffect, useRef } from "react";

interface InviteeResult {
  id: number;
  name: string;
}

interface InviteeSearchProps {
  getAuthHeader: () => Record<string, string>;
  onSelect: (invitee: InviteeResult) => void;
  onBack: () => void;
  registeredOnly?: boolean;
}

export function InviteeSearch({ getAuthHeader, onSelect, onBack, registeredOnly }: InviteeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InviteeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<InviteeResult | null>(null);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setNoResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (registeredOnly) params.set("registeredOnly", "true");
        const res = await fetch(
          `/api/invitees/search?${params.toString()}`,
          { headers: getAuthHeader() }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.invitees);
          setNoResults(data.invitees.length === 0);
        }
      } catch {
        // Silently fail
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, getAuthHeader, registeredOnly]);

  if (confirmTarget) {
    return (
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-xl font-bold text-gray-800">本人確認</h2>
        <p className="text-lg text-gray-700">
          <span className="font-bold text-emerald-500">{confirmTarget.name}</span>
          さんですか？
        </p>
        <div className="w-full max-w-xs flex flex-col gap-3">
          <button
            onClick={() => onSelect(confirmTarget)}
            className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl
                       hover:bg-emerald-600 transition-colors"
          >
            はい
          </button>
          <button
            onClick={() => setConfirmTarget(null)}
            className="w-full py-3 bg-white text-gray-600 font-bold rounded-xl
                       border-2 border-gray-300 hover:bg-gray-50 transition-colors"
          >
            いいえ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xl font-bold text-gray-800">お名前で検索</h2>
      <p className="text-gray-600 text-sm">下のお名前で検索できます</p>

      <div className="w-full max-w-xs flex flex-col gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setConfirmTarget(null);
          }}
          placeholder="例: 太郎"
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl
                     focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 outline-none
                     transition-colors"
          autoFocus
        />

        {searching && (
          <p className="text-gray-400 text-sm text-center">検索中...</p>
        )}

        {noResults && !searching && (
          <p className="text-gray-400 text-sm text-center">見つかりませんでした</p>
        )}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((invitee) => (
              <button
                key={invitee.id}
                onClick={() => setConfirmTarget(invitee)}
                className="w-full px-4 py-3 text-left bg-white border-2 border-gray-200 rounded-xl
                           hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
              >
                <span className="text-gray-800 font-medium">{invitee.name}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          戻る
        </button>
      </div>
    </div>
  );
}
