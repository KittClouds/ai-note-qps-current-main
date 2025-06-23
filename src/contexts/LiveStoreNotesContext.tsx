
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
  createItemsByParentQuery,
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
  const { store } = useStore(); // Fixed: destructure store from the hook result
  const allItems = useQuery(allItems$);
  const selectedItemId = useQuery(selectedItemId$);
  const expandedFolders = useQuery(expandedFolders$);
  const entityAttributesData = useQuery(entityAttributes$);

  // Run migration on first load
  useEffect(() => {
    if (store) {
      migrateLegacyData(store);
    }
  }, [store]);

  // Convert to legacy state format
  const state: FileTreeState = {
    items: allItems || [],
    selectedItemId: selectedItemId || null,
    expandedFolders: new Set(expandedFolders || [])
  };

  const selectedNote = selectedItemId && allItems
    ? allItems.find(item => item.id === selectedItemId && item.type === 'note') as Note || null
    : null;

  const createNote = (parentId?: string): Note => {
    const newNote: Note = {
      id: uuidv4(),
      title: 'Untitled',
      content: defaultContent,
      type: 'note',
      parentId: parentId || undefined, // Convert null to undefined for our type
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Fixed: pass the exact fields that match the schema
    store.commit(events.noteCreated({
      id: newNote.id,
      title: newNote.title,
      content: newNote.content,
      parentId: newNote.parentId || null, // Convert undefined to null for the schema
      createdAt: newNote.createdAt,
      updatedAt: newNote.updatedAt
    }));
    
    store.commit(events.uiStateSet({
      selectedItemId: newNote.id,
      expandedFolders: expandedFolders || [],
      toolbarVisible: true
    }));

    return newNote;
  };

  const createFolder = (parentId?: string): Folder => {
    const newFolder: Folder = {
      id: uuidv4(),
      title: 'Untitled Folder',
      type: 'folder',
      parentId: parentId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.commit(events.folderCreated({
      id: newFolder.id,
      title: newFolder.title,
      parentId: newFolder.parentId || null,
      createdAt: newFolder.createdAt,
      updatedAt: newFolder.updatedAt
    }));
    
    // Add to expanded folders
    const newExpanded = [...(expandedFolders || []), newFolder.id];
    store.commit(events.uiStateSet({
      selectedItemId: selectedItemId || null,
      expandedFolders: newExpanded,
      toolbarVisible: true
    }));

    return newFolder;
  };

  const renameItem = (id: string, newTitle: string) => {
    const item = allItems?.find(item => item.id === id);
    if (!item) return;

    const updates = { 
      title: newTitle.trim() || 'Untitled', 
      updatedAt: new Date().toISOString() 
    };

    if (item.type === 'note') {
      store.commit(events.noteUpdated({ id, updates, updatedAt: updates.updatedAt }));
    } else {
      store.commit(events.folderUpdated({ id, updates, updatedAt: updates.updatedAt }));
    }
  };

  const deleteItem = (id: string) => {
    if (!allItems) return;

    // Get all descendant IDs to delete
    const getDescendants = (parentId: string, visited: Set<string> = new Set()): string[] => {
      if (visited.has(parentId)) {
        console.warn(`Circular reference detected for item ${parentId}`);
        return [];
      }
      
      visited.add(parentId);
      
      const children = allItems.filter(item => item.parentId === parentId);
      const descendants = children.map(child => child.id);
      
      children.forEach(child => {
        descendants.push(...getDescendants(child.id, new Set(visited)));
      });
      
      return descendants;
    };

    const toDelete = new Set([id, ...getDescendants(id)]);
    
    // Delete all items
    toDelete.forEach(itemId => {
      const item = allItems.find(item => item.id === itemId);
      if (item) {
        if (item.type === 'note') {
          store.commit(events.noteDeleted({ id: itemId }));
        } else {
          store.commit(events.folderDeleted({ id: itemId }));
        }
      }
    });

    // Update UI state if selected item was deleted
    if (toDelete.has(selectedItemId || '')) {
      const newExpanded = (expandedFolders || []).filter(folderId => !toDelete.has(folderId));
      store.commit(events.uiStateSet({
        selectedItemId: null,
        expandedFolders: newExpanded,
        toolbarVisible: true
      }));
    }
  };

  const selectItem = (id: string) => {
    const item = allItems?.find(item => item.id === id);
    if (item && item.type === 'note') {
      store.commit(events.uiStateSet({
        selectedItemId: id,
        expandedFolders: expandedFolders || [],
        toolbarVisible: true
      }));
    }
  };

  const updateNoteContent = (id: string, content: string) => {
    store.commit(events.noteUpdated({ 
      id, 
      updates: { content }, 
      updatedAt: new Date().toISOString() 
    }));
  };

  const toggleFolder = (id: string) => {
    const currentExpanded = expandedFolders || [];
    const newExpanded = currentExpanded.includes(id)
      ? currentExpanded.filter(folderId => folderId !== id)
      : [...currentExpanded, id];

    store.commit(events.uiStateSet({
      selectedItemId: selectedItemId || null,
      expandedFolders: newExpanded,
      toolbarVisible: true
    }));
  };

  const getItemsByParent = (parentId?: string): FileSystemItem[] => {
    return allItems?.filter(item => item.parentId === parentId) || [];
  };

  const getConnectionsForNote = (noteId: string): (ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }) | null => {
    const note = allItems?.find(item => item.id === noteId && item.type === 'note') as Note;
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
    const allNotes = (allItems?.filter(item => item.type === 'note') as Note[]) || [];
    
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
    const entityAttr = entityAttributesData?.find(attr => attr.entityKey === entityKey);
    return entityAttr?.attributes || {};
  };

  const setEntityAttributes = (entityKey: string, attributes: Record<string, any>) => {
    store.commit(events.entityAttributesUpdated({
      entityKey,
      attributes,
      updatedAt: new Date().toISOString()
    }));
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
