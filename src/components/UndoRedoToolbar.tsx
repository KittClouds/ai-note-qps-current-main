
import React from 'react';
import { Button } from '@/components/ui/button';
import { useCommandHistory } from '@/contexts/CommandHistoryContext';

export function UndoRedoToolbar() {
  const { undo, redo, canUndo, canRedo, historyState } = useCommandHistory();

  const handleUndo = () => {
    if (canUndo) {
      undo();
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      redo();
    }
  };

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') || 
                 ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo]);

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/50">
      <Button
        size="sm"
        variant="ghost"
        onClick={handleUndo}
        disabled={!canUndo}
        className="h-8 w-8 p-0"
        title={`Undo (${historyState.currentIndex + 1} operations)`}
      >
        ↶
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleRedo}
        disabled={!canRedo}
        className="h-8 w-8 p-0"
        title={`Redo (${historyState.commands.length - historyState.currentIndex - 1} operations)`}
      >
        ↷
      </Button>
      <div className="text-xs text-muted-foreground ml-2">
        {historyState.commands.length > 0 && (
          <span>{historyState.currentIndex + 1}/{historyState.commands.length}</span>
        )}
      </div>
    </div>
  );
}
