import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore, useQuery } from '@livestore/react';
import { Note, Folder, FileSystemItem, FileTreeState } from '@/types/notes';
import { parseNoteConnections, ParsedConnections } from '@/utils/parsingUtils';
import { events } from '@/livestore/schema';
import { 
  notes$, 
  folders$, 
  allItems$, 
  selectedItemId$, 
  expandedFolders$,
  entityAttributes$
} from '@/livestore/queries';
import { migrateLegacyData } from '@/livestore/migration';

interface NotesContextType {
  state: FileTreeState;
  selectedNote: Note | null;
  createNote: (parentId?: string) => Note;
  createFolder: (parentId?: string) => Folder;
  renameItem: (id: string, newTitle: string) => void;
  deleteItem: (id: string) => void;
  selectItem: (id: string) => void;
  updateNoteContent: (id: string, content: string) => void;
  toggleFolder: (id: string) => void;
  getItemsByParent: (parentId?: string) => FileSystemItem[];
  getConnectionsForNote: (noteId: string) => (ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }) | null;
  getEntityAttributes: (entityKey: string) => Record<string, any>;
  setEntityAttributes: (entityKey: string, attributes: Record<string, any>) => void;
}

const NotesContext = createContext<NotesContextType | null>(null);

const defaultContent = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Start writing your note..."}]}]}';

export function LiveStoreNotesProvider({ children }: { children: ReactNode }) {
  // Fix: Properly access the store from LiveStore context
  const store = useStore();
  
  const allItems = useQuery(allItems$);
  const selectedItemId = useQuery(selectedItemId$);
  const expandedFolders = useQuery(expandedFolders$);
  const entityAttributesData = useQuery(entityAttributes$);

  console.log('LiveStore Debug - Store available:', !!store);
  console.log('LiveStore Debug - All Items:', allItems);
  console.log('LiveStore Debug - Selected ID:', selectedItemId);
  console.log('LiveStore Debug - Expanded Folders:', expandedFolders);

  // Run migration on first load
  useEffect(() => {
    if (store) {
      console.log('LiveStore Debug - Running migration with store');
      try {
        const migrationResult = migrateLegacyData(store);
        console.log('LiveStore Debug - Migration result:', migrationResult);
      } catch (error) {
        console.error('LiveStore Debug - Migration error:', error);
      }
    }
  }, [store]);

  // Process query results properly
  const processedItems = Array.isArray(allItems) ? allItems : [];
  const processedSelectedId = selectedItemId || null;
  const processedExpandedFolders = Array.isArray(expandedFolders) ? expandedFolders : [];

  const state: FileTreeState = {
    items: processedItems,
    selectedItemId: processedSelectedId,
    expandedFolders: new Set(processedExpandedFolders)
  };

  const selectedNote = processedSelectedId && processedItems.length > 0
    ? processedItems.find(item => item.id === processedSelectedId && item.type === 'note') as Note || null
    : null;

  const createNote = (parentId?: string): Note => {
    console.log('LiveStore Debug - Creating note with parentId:', parentId);
    
    if (!store) {
      console.error('LiveStore Debug - No store available for note creation');
      const fallbackNote: Note = {
        id: uuidv4(),
        title: 'Untitled',
        content: defaultContent,
        type: 'note',
        parentId: parentId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return fallbackNote;
    }

    const newNote: Note = {
      id: uuidv4(),
      title: 'Untitled',
      content: defaultContent,
      type: 'note',
      parentId: parentId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('LiveStore Debug - New note object:', newNote);

    try {
      // Create the event payload
      const noteCreatedEvent = events.noteCreated({
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        parentId: newNote.parentId || null,
        createdAt: newNote.createdAt,
        updatedAt: newNote.updatedAt
      });

      console.log('LiveStore Debug - Committing note created event:', noteCreatedEvent);
      store.commit(noteCreatedEvent);
      
      // Update UI state to select the new note
      const uiStateEvent = events.uiStateSet({
        selectedItemId: newNote.id,
        expandedFolders: processedExpandedFolders,
        toolbarVisible: true
      });

      console.log('LiveStore Debug - Committing UI state event:', uiStateEvent);
      store.commit(uiStateEvent);

      console.log('LiveStore Debug - Note creation completed successfully');
    } catch (error) {
      console.error('LiveStore Debug - Error creating note:', error);
    }

    return newNote;
  };

  const createFolder = (parentId?: string): Folder => {
    console.log('LiveStore Debug - Creating folder with parentId:', parentId);
    
    if (!store) {
      console.error('LiveStore Debug - No store available for folder creation');
      const fallbackFolder: Folder = {
        id: uuidv4(),
        title: 'Untitled Folder',
        type: 'folder',
        parentId: parentId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return fallbackFolder;
    }

    const newFolder: Folder = {
      id: uuidv4(),
      title: 'Untitled Folder',
      type: 'folder',
      parentId: parentId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('LiveStore Debug - New folder object:', newFolder);

    try {
      const folderCreatedEvent = events.folderCreated({
        id: newFolder.id,
        title: newFolder.title,
        parentId: newFolder.parentId || null,
        createdAt: newFolder.createdAt,
        updatedAt: newFolder.updatedAt
      });

      console.log('LiveStore Debug - Committing folder created event:', folderCreatedEvent);
      store.commit(folderCreatedEvent);
      
      // Add to expanded folders and keep selection
      const newExpanded = [...processedExpandedFolders, newFolder.id];
      const uiStateEvent = events.uiStateSet({
        selectedItemId: processedSelectedId,
        expandedFolders: newExpanded,
        toolbarVisible: true
      });

      console.log('LiveStore Debug - Committing UI state event for folder:', uiStateEvent);
      store.commit(uiStateEvent);

      console.log('LiveStore Debug - Folder creation completed successfully');
    } catch (error) {
      console.error('LiveStore Debug - Error creating folder:', error);
    }

    return newFolder;
  };

  const renameItem = (id: string, newTitle: string) => {
    console.log('LiveStore Debug - Renaming item:', id, 'to:', newTitle);
    
    if (!store) {
      console.error('LiveStore Debug - No store available for rename');
      return;
    }

    const item = processedItems.find(item => item.id === id);
    if (!item) {
      console.warn('LiveStore Debug - Item not found for rename:', id);
      return;
    }

    try {
      const updates = { 
        title: newTitle.trim() || 'Untitled', 
        updatedAt: new Date().toISOString() 
      };

      if (item.type === 'note') {
        const noteUpdatedEvent = events.noteUpdated({ id, updates, updatedAt: updates.updatedAt });
        console.log('LiveStore Debug - Committing note update event:', noteUpdatedEvent);
        store.commit(noteUpdatedEvent);
      } else {
        const folderUpdatedEvent = events.folderUpdated({ id, updates, updatedAt: updates.updatedAt });
        console.log('LiveStore Debug - Committing folder update event:', folderUpdatedEvent);
        store.commit(folderUpdatedEvent);
      }
    } catch (error) {
      console.error('LiveStore Debug - Error renaming item:', error);
    }
  };

  const deleteItem = (id: string) => {
    console.log('LiveStore Debug - Deleting item:', id);
    
    if (!store) {
      console.error('LiveStore Debug - No store available for deletion');
      return;
    }

    if (processedItems.length === 0) {
      console.warn('LiveStore Debug - No items available for deletion');
      return;
    }

    try {
      // Get all descendant IDs to delete
      const getDescendants = (parentId: string, visited: Set<string> = new Set()): string[] => {
        if (visited.has(parentId)) {
          console.warn(`LiveStore Debug - Circular reference detected for item ${parentId}`);
          return [];
        }
        
        visited.add(parentId);
        
        const children = processedItems.filter(item => item.parentId === parentId);
        const descendants = children.map(child => child.id);
        
        children.forEach(child => {
          descendants.push(...getDescendants(child.id, new Set(visited)));
        });
        
        return descendants;
      };

      const toDelete = new Set([id, ...getDescendants(id)]);
      console.log('LiveStore Debug - Items to delete:', Array.from(toDelete));
      
      // Delete all items
      toDelete.forEach(itemId => {
        const item = processedItems.find(item => item.id === itemId);
        if (item) {
          if (item.type === 'note') {
            const noteDeletedEvent = events.noteDeleted({ id: itemId });
            console.log('LiveStore Debug - Committing note delete event:', noteDeletedEvent);
            store.commit(noteDeletedEvent);
          } else {
            const folderDeletedEvent = events.folderDeleted({ id: itemId });
            console.log('LiveStore Debug - Committing folder delete event:', folderDeletedEvent);
            store.commit(folderDeletedEvent);
          }
        }
      });

      // Update UI state if selected item was deleted
      if (toDelete.has(processedSelectedId || '')) {
        const newExpanded = processedExpandedFolders.filter(folderId => !toDelete.has(folderId));
        const uiStateEvent = events.uiStateSet({
          selectedItemId: null,
          expandedFolders: newExpanded,
          toolbarVisible: true
        });
        console.log('LiveStore Debug - Committing UI state event for deletion:', uiStateEvent);
        store.commit(uiStateEvent);
      }
    } catch (error) {
      console.error('LiveStore Debug - Error deleting item:', error);
    }
  };

  const selectItem = (id: string) => {
    console.log('LiveStore Debug - Selecting item:', id);
    
    if (!store) {
      console.error('LiveStore Debug - No store available for selection');
      return;
    }

    const item = processedItems.find(item => item.id === id);
    if (item && item.type === 'note') {
      try {
        const uiStateEvent = events.uiStateSet({
          selectedItemId: id,
          expandedFolders: processedExpandedFolders,
          toolbarVisible: true
        });
        console.log('LiveStore Debug - Committing UI state event for selection:', uiStateEvent);
        store.commit(uiStateEvent);
      } catch (error) {
        console.error('LiveStore Debug - Error selecting item:', error);
      }
    }
  };

  const updateNoteContent = (id: string, content: string) => {
    console.log('LiveStore Debug - Updating note content:', id);
    
    if (!store) {
      console.error('LiveStore Debug - No store available for content update');
      return;
    }

    try {
      const noteUpdatedEvent = events.noteUpdated({ 
        id, 
        updates: { content }, 
        updatedAt: new Date().toISOString() 
      });
      console.log('LiveStore Debug - Committing note content update event:', noteUpdatedEvent);
      store.commit(noteUpdatedEvent);
    } catch (error) {
      console.error('LiveStore Debug - Error updating note content:', error);
    }
  };

  const toggleFolder = (id: string) => {
    console.log('LiveStore Debug - Toggling folder:', id);
    
    if (!store) {
      console.error('LiveStore Debug - No store available for folder toggle');
      return;
    }

    try {
      const newExpanded = processedExpandedFolders.includes(id)
        ? processedExpandedFolders.filter(folderId => folderId !== id)
        : [...processedExpandedFolders, id];

      const uiStateEvent = events.uiStateSet({
        selectedItemId: processedSelectedId,
        expandedFolders: newExpanded,
        toolbarVisible: true
      });
      console.log('LiveStore Debug - Committing UI state event for folder toggle:', uiStateEvent);
      store.commit(uiStateEvent);
    } catch (error) {
      console.error('LiveStore Debug - Error toggling folder:', error);
    }
  };

  const getItemsByParent = (parentId?: string): FileSystemItem[] => {
    const filtered = processedItems.filter(item => item.parentId === parentId);
    console.log('LiveStore Debug - Items by parent', parentId, ':', filtered.length, 'from total:', processedItems.length);
    return filtered;
  };

  const getConnectionsForNote = (noteId: string): (ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }) | null => {
    const note = processedItems.find(item => item.id === noteId && item.type === 'note') as Note;
    if (!note) return null;

    // Parse connections from the note content
    let baseConnections: ParsedConnections;
    try {
      const contentObj = typeof note.content === 'string' ? JSON.parse(note.content) : note.content;
      baseConnections = parseNoteConnections(contentObj);
    } catch (error) {
      console.error('Failed to parse note content for connections:', error);
      baseConnections = {
        tags: [],
        mentions: [],
        links: [],
        entities: [],
        triples: [],
        backlinks: []
      };
    }

    // Find crosslinks - notes that reference this note
    const crosslinks: Array<{ noteId: string; label: string }> = [];
    const allNotes = (processedItems.filter(item => item.type === 'note') as Note[]) || [];
    
    allNotes.forEach(otherNote => {
      if (otherNote.id === noteId) return;
      
      // Check if this note references the target note by title
      const noteTitle = note.title;
      if (otherNote.content.includes(`<<${noteTitle}>>`)) {
        crosslinks.push({
          noteId: otherNote.id,
          label: otherNote.title
        });
      }
    });

    return {
      ...baseConnections,
      crosslinks
    };
  };

  const getEntityAttributes = (entityKey: string): Record<string, any> => {
    const attributes = Array.isArray(entityAttributesData) ? entityAttributesData : [];
    const entityAttr = attributes.find(attr => attr.entityKey === entityKey);
    return entityAttr?.attributes || {};
  };

  const setEntityAttributes = (entityKey: string, attributes: Record<string, any>) => {
    if (!store) {
      console.error('LiveStore Debug - No store available for entity attributes');
      return;
    }

    try {
      const entityAttributesEvent = events.entityAttributesUpdated({
        entityKey,
        attributes,
        updatedAt: new Date().toISOString()
      });
      console.log('LiveStore Debug - Committing entity attributes update event:', entityAttributesEvent);
      store.commit(entityAttributesEvent);
    } catch (error) {
      console.error('LiveStore Debug - Error setting entity attributes:', error);
    }
  };

  return (
    <NotesContext.Provider value={{
      state,
      selectedNote,
      createNote,
      createFolder,
      renameItem,
      deleteItem,
      selectItem,
      updateNoteContent,
      toggleFolder,
      getItemsByParent,
      getConnectionsForNote,
      getEntityAttributes,
      setEntityAttributes
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a LiveStoreNotesProvider');
  }
  return context;
}
