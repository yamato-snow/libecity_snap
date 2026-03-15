"use client";

import { useState, useCallback } from "react";

const MAX_SELECTION = 20;

export function usePhotoSelection() {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const enterSelectMode = useCallback(() => {
    setSelectMode(true);
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SELECTION) {
          alert(`一度に保存できるのは${MAX_SELECTION}枚までです`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((allIds: string[]) => {
    setSelectedIds((prev) => {
      if (prev.size === allIds.length) {
        return new Set();
      }
      const limited = allIds.slice(0, MAX_SELECTION);
      if (allIds.length > MAX_SELECTION) {
        alert(`一度に保存できるのは${MAX_SELECTION}枚までです。最初の${MAX_SELECTION}枚を選択しました。`);
      }
      return new Set(limited);
    });
  }, []);

  return {
    selectMode,
    selectedIds,
    enterSelectMode,
    exitSelectMode,
    toggleSelect,
    toggleSelectAll,
    selectedCount: selectedIds.size,
  };
}
