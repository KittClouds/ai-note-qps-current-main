
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BulkSelectionContextType {
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  toggleSelection: (id: string) => void;
  toggleAll: (allIds: string[]) => void;
  clearSelection: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  selectAll: (allIds: string[]) => void;
  hasSelection: boolean;
}

const BulkSelectionContext = createContext<BulkSelectionContextType | null>(null);

export function BulkSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAll = (allIds: string[]) => {
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const enterSelectionMode = () => {
    setIsSelectionMode(true);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    clearSelection();
  };

  const selectAll = (allIds: string[]) => {
    setSelectedIds(new Set(allIds));
  };

  const hasSelection = selectedIds.size > 0;

  return (
    <BulkSelectionContext.Provider value={{
      selectedIds,
      isSelectionMode,
      toggleSelection,
      toggleAll,
      clearSelection,
      enterSelectionMode,
      exitSelectionMode,
      selectAll,
      hasSelection
    }}>
      {children}
    </BulkSelectionContext.Provider>
  );
}

export function useBulkSelection() {
  const context = useContext(BulkSelectionContext);
  if (!context) {
    throw new Error('useBulkSelection must be used within a BulkSelectionProvider');
  }
  return context;
}
