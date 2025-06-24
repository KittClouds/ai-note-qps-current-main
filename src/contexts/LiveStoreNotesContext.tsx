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
import { useToast } from '@/hooks/use-toast';
import { useCommandHistory } from '@/contexts/CommandHistoryContext';
import { useMergeVacuum } from '@/hooks/useMergeVacuum';

interface NotesContextType {
  state: FileTreeState;
  selectedNote: Note | null;
  createNote: (parentId?: string) => Note;
  createFolder: (parentId?: string) => Folder;
  renameItem: (id: string, newTitle: string) => void;
  deleteItem: (id: string) => void;
  bulkDeleteItems: (ids: string[]) => Promise<void>;
  selectItem: (id: string) => void;
  updateNoteContent: (id: string, content: string) => void;
  toggleFolder: (id: string) => void;
  getItemsByParent: (parentId?: string) => FileSystemItem[];
  getConnectionsForNote: (noteId: string) => (ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }) | null;
  getEntityAttributes: (entityKey: string) => Record<string, any>;
  setEntityAttributes: (entityKey: string, attributes: Record<string, any>) => void;
  getSystemStatus: () => {
    mergeVacuum: any;
  };
}

const NotesContext = createContext<NotesContextType | null>(null);

const defaultContent = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Start writing your note..."}]}]}';

export function LiveStoreNotesProvider({ children }: { children: ReactNode }) {
  const storeWrapper = useStore();
  const actualStore = storeWrapper?.store;
  const { toast } = useToast();
  const { executeCommand, createNoteCommand, updateNoteContentCommand, deleteNoteCommand } = useCommandHistory();
  
  const allItems = useQuery(allItems$);
  const selectedItemId = useQuery(selectedItemId$);
  const expandedFolders = useQuery(expandedFolders$);
  const entityAttributesData = useQuery(entityAttributes$);

  console.log('LiveStore Debug - Store wrapper available:', !!storeWrapper);
  console.log('LiveStore Debug - Actual store available:', !!actualStore);
  console.log('LiveStore Debug - All Items:', allItems);
  console.log('LiveStore Debug - Selected ID:', selectedItemId);
  console.log('LiveStore Debug - Expanded Folders:', expandedFolders);

  // Add merge-vacuum service
  const { stats: mergeVacuumStats, recordActivity, updateLogSize } = useMergeVacuum();

  // Run migration on first load
  useEffect(() => {
    if (actualStore) {
      console.log('LiveStore Debug - Running migration with actual store');
      try {
        const migrationResult = migrateLegacyData(actualStore);
        console.log('LiveStore Debug - Migration result:', migrationResult);
      } catch (error) {
        console.error('LiveStore Debug - Migration error:', error);
      }
    }
  }, [actualStore]);

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
    
    // Record activity for merge-vacuum
    recordActivity();
    
    if (!actualStore) {
      console.error('LiveStore Debug - No actual store available for note creation');
      toast({
        title: "Error",
        description: "Unable to create note: Store not available",
        variant: "destructive"
      });
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
      // Use command pattern for undo/redo support
      const command = createNoteCommand({
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        parentId: newNote.parentId || null,
        createdAt: newNote.createdAt,
        updatedAt: newNote.updatedAt
      });

      executeCommand(command);
      
      // Update UI state to select the new note
      const uiStateEvent = events.uiStateSet({
        selectedItemId: newNote.id,
        expandedFolders: processedExpandedFolders,
        toolbarVisible: true
      });

      console.log('LiveStore Debug - Committing UI state event:', uiStateEvent);
      actualStore.commit(uiStateEvent);

      console.log('LiveStore Debug - Note creation completed successfully');
      
      // Show success toast
      toast({
        title: "Success",
        description: "Note created successfully",
      });
      
    } catch (error) {
      console.error('LiveStore Debug - Error creating note:', error);
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive"
      });
    }

    return newNote;
  };

  const updateNoteContent = (id: string, content: string) => {
    console.log('LiveStore Debug - Updating note content:', id);
    
    // Record activity for merge-vacuum
    recordActivity();
    
    if (!actualStore) {
      console.error('LiveStore Debug - No actual store available for content update');
      return;
    }

    try {
      // Get the current note for old content
      const currentNote = processedItems.find(item => item.id === id && item.type === 'note') as Note;
      if (!currentNote) {
        console.error('LiveStore Debug - Note not found for content update:', id);
        return;
      }

      // Use command pattern for undo/redo support
      const command = updateNoteContentCommand(id, content, currentNote.content);
      executeCommand(command);

      // Update log size estimation (rough approximation)
      const contentSize = new Blob([content]).size;
      updateLogSize(contentSize);

      console.log('LiveStore Debug - Note content update completed successfully');
    } catch (error) {
      console.error('LiveStore Debug - Error updating note content:', error);
    }
  };

  const deleteItem = (id: string) => {
    console.log('LiveStore Debug - Deleting item:', id);
    
    if (!actualStore) {
      console.error('LiveStore Debug - No actual store available for deletion');
      return;
    }

    if (processedItems.length === 0) {
      console.warn('LiveStore Debug - No items available for deletion');
      return;
    }

    try {
      const item = processedItems.find(item => item.id === id);
      if (!item) {
        console.warn('LiveStore Debug - Item not found for deletion:', id);
        return;
      }

      // Use command pattern for undo/redo support (notes only for now)
      if (item.type === 'note') {
        const command = deleteNoteCommand(id, {
          id: item.id,
          title: item.title,
          content: item.content,
          parentId: item.parentId || null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        });
        executeCommand(command);
      } else {
        // For folders, use direct deletion (can be enhanced later)
        const folderDeletedEvent = events.folderDeleted({ id });
        console.log('LiveStore Debug - Committing folder delete event:', folderDeletedEvent);
        actualStore.commit(folderDeletedEvent);
      }

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
            actualStore.commit(noteDeletedEvent);
          } else {
            const folderDeletedEvent = events.folderDeleted({ id: itemId });
            console.log('LiveStore Debug - Committing folder delete event:', folderDeletedEvent);
            actualStore.commit(folderDeletedEvent);
          }
        }
      });

      // Update UI state if selected item was deleted
      if (id === processedSelectedId) {
        const uiStateEvent = events.uiStateSet({
          selectedItemId: null,
          expandedFolders: processedExpandedFolders.filter(folderId => folderId !== id),
          toolbarVisible: true
        });
        console.log('LiveStore Debug - Committing UI state event for deletion:', uiStateEvent);
        actualStore.commit(uiStateEvent);
      }
    } catch (error) {
      console.error('LiveStore Debug - Error deleting item:', error);
    }
  };

  const createFolder = (parentId?: string): Folder => {
    console.log('LiveStore Debug - Creating folder with parentId:', parentId);
    
    if (!actualStore) {
      console.error('LiveStore Debug - No actual store available for folder creation');
      toast({
        title: "Error",
        description: "Unable to create folder: Store not available",
        variant: "destructive"
      });
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
      // Use the correct folderCreated event with only the fields that exist
      const folderCreatedEvent = events.folderCreated({
        id: newFolder.id,
        title: newFolder.title,
        parentId: newFolder.parentId || null,
        createdAt: newFolder.createdAt,
        updatedAt: newFolder.updatedAt
      });

      console.log('LiveStore Debug - Committing folder created event:', folderCreatedEvent);
      actualStore.commit(folderCreatedEvent);
      
      // Add to expanded folders and keep selection
      const newExpanded = [...processedExpandedFolders, newFolder.id];
      const uiStateEvent = events.uiStateSet({
        selectedItemId: processedSelectedId,
        expandedFolders: newExpanded,
        toolbarVisible: true
      });

      console.log('LiveStore Debug - Committing UI state event for folder:', uiStateEvent);
      actualStore.commit(uiStateEvent);

      console.log('LiveStore Debug - Folder creation completed successfully');
      
      // Show success toast
      toast({
        title: "Success",
        description: "Folder created successfully",
      });
      
    } catch (error) {
      console.error('LiveStore Debug - Error creating folder:', error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive"
      });
    }

    return newFolder;
  };

  const renameItem = (id: string, newTitle: string) => {
    console.log('LiveStore Debug - Renaming item:', id, 'to:', newTitle);
    
    if (!actualStore) {
      console.error('LiveStore Debug - No actual store available for rename');
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
        actualStore.commit(noteUpdatedEvent);
      } else {
        const folderUpdatedEvent = events.folderUpdated({ id, updates, updatedAt: updates.updatedAt });
        console.log('LiveStore Debug - Committing folder update event:', folderUpdatedEvent);
        actualStore.commit(folderUpdatedEvent);
      }
    } catch (error) {
      console.error('LiveStore Debug - Error renaming item:', error);
    }
  };

  const bulkDeleteItems = async (ids: string[]): Promise<void> => {
    console.log('LiveStore Debug - Bulk deleting items:', ids);
    
    if (!actualStore) {
      console.error('LiveStore Debug - No actual store available for bulk deletion');
      throw new Error('Store not available');
    }

    if (processedItems.length === 0) {
      console.warn('LiveStore Debug - No items available for bulk deletion');
      return;
    }

    try {
      // Get all descendant IDs for all selected items
      const getAllDescendants = (parentIds: string[]): string[] => {
        const visited = new Set<string>();
        const allDescendants = new Set<string>();
        
        const getDescendantsRecursive = (parentId: string): string[] => {
          if (visited.has(parentId)) {
            console.warn(`LiveStore Debug - Circular reference detected for item ${parentId}`);
            return [];
          }
          
          visited.add(parentId);
          
          const children = processedItems.filter(item => item.parentId === parentId);
          const descendants = children.map(child => child.id);
          
          children.forEach(child => {
            descendants.push(...getDescendantsRecursive(child.id));
          });
          
          return descendants;
        };

        parentIds.forEach(parentId => {
          const descendants = getDescendantsRecursive(parentId);
          descendants.forEach(id => allDescendants.add(id));
        });

        return Array.from(allDescendants);
      };

      const allDescendants = getAllDescendants(ids);
      const toDelete = new Set([...ids, ...allDescendants]);
      
      console.log('LiveStore Debug - Items to bulk delete:', Array.from(toDelete));
      
      // Batch delete all items
      const deletePromises: Promise<void>[] = [];
      
      toDelete.forEach(itemId => {
        const item = processedItems.find(item => item.id === itemId);
        if (item) {
          if (item.type === 'note') {
            const noteDeletedEvent = events.noteDeleted({ id: itemId });
            deletePromises.push(Promise.resolve(actualStore.commit(noteDeletedEvent)));
          } else {
            const folderDeletedEvent = events.folderDeleted({ id: itemId });
            deletePromises.push(Promise.resolve(actualStore.commit(folderDeletedEvent)));
          }
        }
      });

      // Wait for all deletions to complete
      await Promise.all(deletePromises);

      // Update UI state if selected item was deleted
      if (toDelete.has(processedSelectedId || '')) {
        const newExpanded = processedExpandedFolders.filter(folderId => !toDelete.has(folderId));
        const uiStateEvent = events.uiStateSet({
          selectedItemId: null,
          expandedFolders: newExpanded,
          toolbarVisible: true
        });
        console.log('LiveStore Debug - Committing UI state event for bulk deletion:', uiStateEvent);
        actualStore.commit(uiStateEvent);
      }

      console.log('LiveStore Debug - Bulk deletion completed successfully');
    } catch (error) {
      console.error('LiveStore Debug - Error during bulk deletion:', error);
      throw error;
    }
  };

  const selectItem = (id: string) => {
    console.log('LiveStore Debug - Selecting item:', id);
    
    if (!actualStore) {
      console.error('LiveStore Debug - No actual store available for selection');
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
        actualStore.commit(uiStateEvent);
      } catch (error) {
        console.error('LiveStore Debug - Error selecting item:', error);
      }
    }
  };

  const toggleFolder = (id: string) => {
    console.log('LiveStore Debug - Toggling folder:', id);
    
    if (!actualStore) {
      console.error('LiveStore Debug - No actual store available for folder toggle');
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
      actualStore.commit(uiStateEvent);
    } catch (error) {
      console.error('LiveStore Debug - Error toggling folder:', error);
    }
  };

  const getItemsByParent = (parentId?: string): FileSystemItem[] => {
    console.log('LiveStore Debug - Getting items by parent:', parentId);
    console.log('LiveStore Debug - Total items available:', processedItems.length);
    
    const filtered = processedItems.filter(item => {
      if (parentId === undefined) {
        const isRoot = item.parentId === null || item.parentId === undefined;
        console.log('LiveStore Debug - Item', item.id, 'parentId:', item.parentId, 'isRoot:', isRoot);
        return isRoot;
      } else {
        return item.parentId === parentId;
      }
    });
    
    console.log('LiveStore Debug - Filtered items for parent', parentId, ':', filtered.length);
    console.log('LiveStore Debug - Filtered items:', filtered.map(item => ({ id: item.id, title: item.title, type: item.type, parentId: item.parentId })));
    
    return filtered;
  };

  const getConnectionsForNote = (noteId: string): (ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }) | null => {
    const note = processedItems.find(item => item.id === noteId && item.type === 'note') as Note;
    if (!note) return null;

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

    const crosslinks: Array<{ noteId: string; label: string }> = [];
    const allNotes = (processedItems.filter(item => item.type === 'note') as Note[]) || [];
    
    allNotes.forEach(otherNote => {
      if (otherNote.id === noteId) return;
      
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
    if (!actualStore) {
      console.error('LiveStore Debug - No actual store available for entity attributes');
      return;
    }

    try {
      const entityAttributesEvent = events.entityAttributesUpdated({
        entityKey,
        attributes,
        updatedAt: new Date().toISOString()
      });
      console.log('LiveStore Debug - Committing entity attributes update event:', entityAttributesEvent);
      actualStore.commit(entityAttributesEvent);
    } catch (error) {
      console.error('LiveStore Debug - Error setting entity attributes:', error);
    }
  };

  const getSystemStatus = () => {
    return {
      mergeVacuum: mergeVacuumStats
    };
  };

  return (
    <NotesContext.Provider value={{
      state,
      selectedNote,
      createNote,
      createFolder,
      renameItem,
      deleteItem,
      bulkDeleteItems,
      selectItem,
      updateNoteContent,
      toggleFolder,
      getItemsByParent,
      getConnectionsForNote,
      getEntityAttributes,
      setEntityAttributes,
      getSystemStatus
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
