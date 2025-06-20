
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Note, Folder, FileSystemItem, FileTreeState } from '@/types/notes';

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
}

const NotesContext = createContext<NotesContextType | null>(null);

const STORAGE_KEY = 'notes-app-data';

const defaultContent = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Start writing your note..."}]}]}';

export function NotesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FileTreeState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          expandedFolders: new Set(parsed.expandedFolders || [])
        };
      }
    } catch (error) {
      console.error('Failed to load notes from localStorage:', error);
    }
    
    // Create a default note if nothing exists
    const defaultNote: Note = {
      id: uuidv4(),
      title: 'Welcome',
      content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Welcome to your note editor! Try typing some notes with special syntax like #tags, [[wiki links]], or <<cross links>>."}]}]}',
      type: 'note',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return {
      items: [defaultNote],
      selectedItemId: defaultNote.id,
      expandedFolders: new Set<string>()
    };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      const toSave = {
        ...state,
        expandedFolders: Array.from(state.expandedFolders)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save notes to localStorage:', error);
    }
  }, [state]);

  const selectedNote = state.selectedItemId 
    ? state.items.find(item => item.id === state.selectedItemId && item.type === 'note') as Note || null
    : null;

  const createNote = (parentId?: string): Note => {
    const newNote: Note = {
      id: uuidv4(),
      title: 'Untitled',
      content: defaultContent,
      type: 'note',
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      items: [...prev.items, newNote],
      selectedItemId: newNote.id
    }));

    return newNote;
  };

  const createFolder = (parentId?: string): Folder => {
    const newFolder: Folder = {
      id: uuidv4(),
      title: 'Untitled Folder',
      type: 'folder',
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      items: [...prev.items, newFolder],
      expandedFolders: new Set([...prev.expandedFolders, newFolder.id])
    }));

    return newFolder;
  };

  const renameItem = (id: string, newTitle: string) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id
          ? { ...item, title: newTitle.trim() || 'Untitled', updatedAt: new Date().toISOString() }
          : item
      )
    }));
  };

  const deleteItem = (id: string) => {
    setState(prev => {
      // Get all descendant IDs to delete with cycle detection
      const getDescendants = (parentId: string, visited: Set<string> = new Set()): string[] => {
        // Prevent infinite recursion by checking if we've already visited this node
        if (visited.has(parentId)) {
          console.warn(`Circular reference detected for item ${parentId}`);
          return [];
        }
        
        visited.add(parentId);
        
        const children = prev.items.filter(item => item.parentId === parentId);
        const descendants = children.map(child => child.id);
        
        children.forEach(child => {
          descendants.push(...getDescendants(child.id, new Set(visited)));
        });
        
        return descendants;
      };

      const toDelete = new Set([id, ...getDescendants(id)]);
      const remainingItems = prev.items.filter(item => !toDelete.has(item.id));

      return {
        ...prev,
        items: remainingItems,
        selectedItemId: toDelete.has(prev.selectedItemId || '') ? null : prev.selectedItemId,
        expandedFolders: new Set([...prev.expandedFolders].filter(folderId => !toDelete.has(folderId)))
      };
    });
  };

  const selectItem = (id: string) => {
    const item = state.items.find(item => item.id === id);
    if (item && item.type === 'note') {
      setState(prev => ({ ...prev, selectedItemId: id }));
    }
  };

  const updateNoteContent = (id: string, content: string) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id && item.type === 'note'
          ? { ...item, content, updatedAt: new Date().toISOString() }
          : item
      )
    }));
  };

  const toggleFolder = (id: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedFolders);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { ...prev, expandedFolders: newExpanded };
    });
  };

  const getItemsByParent = (parentId?: string): FileSystemItem[] => {
    return state.items.filter(item => item.parentId === parentId);
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
      getItemsByParent
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
