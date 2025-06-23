
import React from 'react';
import { useNotes } from '@/contexts/LiveStoreNotesContext';
import { EntityAttributePanel } from './EntityAttributePanel';
import { parseNoteConnections } from '@/utils/parsingUtils';

export const EntityAttributePanelContainer = () => {
  const { selectedNote } = useNotes();
  
  // Parse connections reactively - this will update when note content changes
  const connections = React.useMemo(() => {
    if (!selectedNote) return null;
    
    try {
      const contentObj = typeof selectedNote.content === 'string' 
        ? JSON.parse(selectedNote.content) 
        : selectedNote.content;
      
      return parseNoteConnections(contentObj);
    } catch (error) {
      console.error('Failed to parse note content for entity attributes:', error);
      return null;
    }
  }, [selectedNote?.content]);

  return (
    <EntityAttributePanel 
      connections={connections}
      noteTitle={selectedNote?.title}
    />
  );
};
