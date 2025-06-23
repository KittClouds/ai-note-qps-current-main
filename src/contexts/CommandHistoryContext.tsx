
import React, { createContext, useContext, ReactNode, useRef, useEffect } from 'react';
import { useStore } from '@livestore/react';
import { CommandHistory, HistoryState } from '@/lib/commands/CommandHistory';
import { Command } from '@/lib/commands/Command';
import { CreateNoteCommand, UpdateNoteContentCommand, DeleteNoteCommand } from '@/lib/commands/NoteCommands';

interface CommandHistoryContextType {
  executeCommand: (command: Command) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  historyState: HistoryState;
  createNoteCommand: (noteData: any) => CreateNoteCommand;
  updateNoteContentCommand: (noteId: string, newContent: string, oldContent: string) => UpdateNoteContentCommand;
  deleteNoteCommand: (noteId: string, noteData: any) => DeleteNoteCommand;
}

const CommandHistoryContext = createContext<CommandHistoryContextType | null>(null);

export function CommandHistoryProvider({ children }: { children: ReactNode }) {
  const storeWrapper = useStore();
  const actualStore = storeWrapper?.store;
  const historyRef = useRef(new CommandHistory(50));
  const [historyState, setHistoryState] = React.useState<HistoryState>(historyRef.current.getState());

  useEffect(() => {
    const unsubscribe = historyRef.current.subscribe(setHistoryState);
    return unsubscribe;
  }, []);

  const executeCommand = (command: Command) => {
    historyRef.current.execute(command);
  };

  const undo = () => {
    return historyRef.current.undo();
  };

  const redo = () => {
    return historyRef.current.redo();
  };

  const createNoteCommand = (noteData: any) => {
    if (!actualStore) throw new Error('Store not available');
    return new CreateNoteCommand(actualStore, noteData);
  };

  const updateNoteContentCommand = (noteId: string, newContent: string, oldContent: string) => {
    if (!actualStore) throw new Error('Store not available');
    return new UpdateNoteContentCommand(actualStore, noteId, newContent, oldContent);
  };

  const deleteNoteCommand = (noteId: string, noteData: any) => {
    if (!actualStore) throw new Error('Store not available');
    return new DeleteNoteCommand(actualStore, noteId, noteData);
  };

  return (
    <CommandHistoryContext.Provider value={{
      executeCommand,
      undo,
      redo,
      canUndo: historyState.currentIndex >= 0,
      canRedo: historyState.currentIndex < historyState.commands.length - 1,
      historyState,
      createNoteCommand,
      updateNoteContentCommand,
      deleteNoteCommand
    }}>
      {children}
    </CommandHistoryContext.Provider>
  );
}

export function useCommandHistory() {
  const context = useContext(CommandHistoryContext);
  if (!context) {
    throw new Error('useCommandHistory must be used within a CommandHistoryProvider');
  }
  return context;
}
