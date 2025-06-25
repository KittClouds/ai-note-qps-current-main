
import React from 'react';
import { useNotes } from '@/contexts/LiveStoreNotesContext';
import ConnectionsPanel from './ConnectionsPanel';

interface ConnectionsPanelContainerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ConnectionsPanelContainer = ({ isOpen, onToggle }: ConnectionsPanelContainerProps) => {
  const { selectedNote, getConnectionsForNote } = useNotes();
  
  // Get connections for the currently selected note
  const connections = React.useMemo(() => {
    if (!selectedNote) return null;
    return getConnectionsForNote(selectedNote.id);
  }, [selectedNote?.id, selectedNote?.content, getConnectionsForNote]);

  return (
    <ConnectionsPanel 
      connections={connections}
      selectedNote={selectedNote}
      isOpen={isOpen}
      onToggle={onToggle}
    />
  );
};
