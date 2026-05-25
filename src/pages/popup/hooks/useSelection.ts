import { useEffect, useMemo, useRef, useState } from 'react';
import { NetworkRequestRecord } from '@src/lib/quick-copy';

export function useSelection(filteredRequests: NetworkRequestRecord[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastClickedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredRequests.some((request) => request.id === id)),
    );
  }, [filteredRequests]);

  const selectedRequests = useMemo(
    () => filteredRequests.filter((request) => selectedIds.includes(request.id)),
    [filteredRequests, selectedIds],
  );

  function toggleRequest(id: string, index: number, shiftKey: boolean) {
    if (shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      setSelectedIds((current) => {
        const next = new Set(current);
        for (let i = start; i <= end; i++) {
          next.add(filteredRequests[i].id);
        }
        return Array.from(next);
      });
    } else {
      setSelectedIds((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
    }
    lastClickedIndexRef.current = index;
  }

  function selectAll() {
    setSelectedIds(filteredRequests.map((request) => request.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  return {
    selectedIds,
    setSelectedIds,
    selectedRequests,
    toggleRequest,
    selectAll,
    clearSelection,
  };
}
