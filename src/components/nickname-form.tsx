"use client";

import { useState } from "react";

interface NicknameFormProps {
  onSubmit: (nickname: string) => Promise<void>;
  title?: string;
  description?: string;
  submitLabel?: string;
  loadingLabel?: string;
  hideHeader?: boolean;
}

export function NicknameForm({ onSubmit, title, description, submitLabel, loadingLabel, hideHeader }: NicknameFormProps) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("ニックネームを入力してください");
      return;
    }
    if (trimmed.length > 20) {
      setError("ニックネームは20文字以内にしてください");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onSubmit(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {!hideHeader && (
        <>
          <h2 className="text-xl font-bold text-gray-800">{title || "ようこそ！"}</h2>
          <p className="text-gray-600">{description || "ニックネームを入力してください"}</p>
        </>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
        <input
          type="text"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setError("");
          }}
          placeholder="例: たろう"
          maxLength={20}
          disabled={loading}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl
                     focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 outline-none
                     disabled:opacity-50 transition-colors"
          autoFocus
        />
        <p className="text-xs text-gray-400 text-center">
          ※ 他の参加者に表示されます
        </p>

        {error && <p className="text-red-500 text-sm text-center whitespace-pre-line">{error}</p>}

        <button
          type="submit"
          disabled={loading || !nickname.trim()}
          className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl
                     hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {loading ? (loadingLabel || "登録中...") : (submitLabel || "はじめる")}
        </button>
      </form>
    </div>
  );
}
