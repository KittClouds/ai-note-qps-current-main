
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
  const store = useStore();
  const allItems = useQuery(allItems$);
  const selectedItemId = useQuery(selectedItemId$);
  const expandedFolders = useQuery(expandedFolders$);
  const entityAttributesData = useQuery(entityAttributes$);

  // Add debugging for store and queries
  console.log('LiveStore Debug - Store:', !!store);
  console.log('LiveStore Debug - Store object:', store);
  console.log('LiveStore Debug - All Items:', allItems);
  console.log('LiveStore Debug - Selected ID:', selectedItemId);
  console.log('LiveStore Debug - Expanded Folders:', expandedFolders);

  // Run migration on first load
  useEffect(() => {
    if (store?.store) {
      console.log('LiveStore Debug - Running migration with store');
      // Create a migration-compatible object with commit function
      const migrationStore = {
        commit: (event: any) => {
          console.log('LiveStore Debug - Migration committing event:', event);
          // Access the actual store from the wrapper
          const actualStore = (store as any).store;
          if (actualStore && actualStore.commit) {
            return actualStore.commit(event);
          } else {
            console.error('LiveStore Debug - No commit method found on actual store');
          }
        }
      };
      const migrationResult = migrateLegacyData(migrationStore as any);
      console.log('LiveStore Debug - Migration result:', migrationResult);
    }
  }, [store]);

  // Helper function to commit events
  const commitEvent = (event: any) => {
    console.log('LiveStore Debug - Committing event:', event);
    try {
      // Try to access the actual store from the wrapper
      const actualStore = (store as any)?.store;
      if (actualStore && actualStore.commit) {
        actualStore.commit(event);
        console.log('LiveStore Debug - Event committed successfully');
      } else {
        console.error('LiveStore Debug - No commit method available');
      }
    } catch (error) {
      console.error('LiveStore Debug - Error committing event:', error);
    }
  };

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
    console.log('LiveStore Debug - Creating note with parentId:', parentId);
    
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

    // Create the event payload
    const eventPayload = {
      id: newNote.id,
      title: newNote.title,
      content: newNote.content,
      parentId: newNote.parentId || null,
      createdAt: newNote.createdAt,
      updatedAt: newNote.updatedAt
    };

    console.log('LiveStore Debug - Event payload:', eventPayload);

    commitEvent(events.noteCreated(eventPayload));
    
    commitEvent(events.uiStateSet({
      selectedItemId: newNote.id,
      expandedFolders: expandedFolders || [],
      toolbarVisible: true
    }));

    return newNote;
  };

  const createFolder = (parentId?: string): Folder => {
    console.log('LiveStore Debug - Creating folder with parentId:', parentId);
    
    const newFolder: Folder = {
      id: uuidv4(),
      title: 'Untitled Folder',
      type: 'folder',
      parentId: parentId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('LiveStore Debug - New folder object:', newFolder);

    const eventPayload = {
      id: newFolder.id,
      title: newFolder.title,
      parentId: newFolder.parentId || null,
      createdAt: newFolder.createdAt,
      updatedAt: newFolder.updatedAt
    };

    console.log('LiveStore Debug - Folder event payload:', eventPayload);

    commitEvent(events.folderCreated(eventPayload));
    
    // Add to expanded folders
    const newExpanded = [...(expandedFolders || []), newFolder.id];
    commitEvent(events.uiStateSet({
      selectedItemId: selectedItemId || null,
      expandedFolders: newExpanded,
      toolbarVisible: true
    }));

    return newFolder;
  };

  const renameItem = (id: string, newTitle: string) => {
    console.log('LiveStore Debug - Renaming item:', id, 'to:', newTitle);
    
    const item = allItems?.find(item => item.id === id);
    if (!item) {
      console.warn('LiveStore Debug - Item not found for rename:', id);
      return;
    }

    const updates = { 
      title: newTitle.trim() || 'Untitled', 
      updatedAt: new Date().toISOString() 
    };

    if (item.type === 'note') {
      commitEvent(events.noteUpdated({ id, updates, updatedAt: updates.updatedAt }));
    } else {
      commitEvent(events.folderUpdated({ id, updates, updatedAt: updates.updatedAt }));
    }
  };

  const deleteItem = (id: string) => {
    console.log('LiveStore Debug - Deleting item:', id);
    
    if (!allItems) {
      console.warn('LiveStore Debug - No items available for deletion');
      return;
    }

    // Get all descendant IDs to delete
    const getDescendants = (parentId: string, visited: Set<string> = new Set()): string[] => {
      if (visited.has(parentId)) {
        console.warn(`LiveStore Debug - Circular reference detected for item ${parentId}`);
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
    console.log('LiveStore Debug - Items to delete:', Array.from(toDelete));
    
    // Delete all items
    toDelete.forEach(itemId => {
      const item = allItems.find(item => item.id === itemId);
      if (item) {
        if (item.type === 'note') {
          commitEvent(events.noteDeleted({ id: itemId }));
        } else {
          commitEvent(events.folderDeleted({ id: itemId }));
        }
        console.log('LiveStore Debug - Deleted item:', itemId);
      }
    });

    // Update UI state if selected item was deleted
    if (toDelete.has(selectedItemId || '')) {
      const newExpanded = (expandedFolders || []).filter(folderId => !toDelete.has(folderId));
      commitEvent(events.uiStateSet({
        selectedItemId: null,
        expandedFolders: newExpanded,
        toolbarVisible: true
      }));
    }
  };

  const selectItem = (id: string) => {
    console.log('LiveStore Debug - Selecting item:', id);
    
    const item = allItems?.find(item => item.id === id);
    if (item && item.type === 'note') {
      commitEvent(events.uiStateSet({
        selectedItemId: id,
        expandedFolders: expandedFolders || [],
        toolbarVisible: true
      }));
    }
  };

  const updateNoteContent = (id: string, content: string) => {
    console.log('LiveStore Debug - Updating note content:', id);
    
    commitEvent(events.noteUpdated({ 
      id, 
      updates: { content }, 
      updatedAt: new Date().toISOString() 
    }));
  };

  const toggleFolder = (id: string) => {
    console.log('LiveStore Debug - Toggling folder:', id);
    
    const currentExpanded = expandedFolders || [];
    const newExpanded = currentExpanded.includes(id)
      ? currentExpanded.filter(folderId => folderId !== id)
      : [...currentExpanded, id];

    commitEvent(events.uiStateSet({
      selectedItemId: selectedItemId || null,
      expandedFolders: newExpanded,
      toolbarVisible: true
    }));
  };

  const getItemsByParent = (parentId?: string): FileSystemItem[] => {
    const items = allItems?.filter(item => item.parentId === parentId) || [];
    console.log('LiveStore Debug - Items by parent', parentId, ':', items);
    return items;
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
    commitEvent(events.entityAttributesUpdated({
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
