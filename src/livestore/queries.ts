
import { queryDb, computed } from '@livestore/livestore';
import { tables } from './schema';

// Basic entity queries
export const notes$ = queryDb(
  tables.notes.orderBy('createdAt', 'desc'),
  { label: 'notes$' }
);

export const folders$ = queryDb(
  tables.folders.orderBy('createdAt', 'desc'),
  { label: 'folders$' }
);

export const entityAttributes$ = queryDb(
  tables.entityAttributes.orderBy('updatedAt', 'desc'),
  { label: 'entityAttributes$' }
);

// UI state queries
export const uiState$ = computed((get) => {
  const results = get(queryDb(tables.uiState, { label: 'uiStateRaw$' }));
  return Array.isArray(results) && results.length > 0 ? results[0].value : {
    selectedItemId: null,
    expandedFolders: [],
    toolbarVisible: true
  };
}, { label: 'uiState$' });

export const selectedItemId$ = computed((get) => {
  const ui = get(uiState$);
  return ui?.selectedItemId || null;
}, { label: 'selectedItemId$' });

export const expandedFolders$ = computed((get) => {
  const ui = get(uiState$);
  return ui?.expandedFolders || [];
}, { label: 'expandedFolders$' });

export const toolbarVisible$ = computed((get) => {
  const ui = get(uiState$);
  return ui?.toolbarVisible ?? true;
}, { label: 'toolbarVisible$' });

// Combined items query (notes + folders)
export const allItems$ = computed((get) => {
  const notes = get(notes$);
  const folders = get(folders$);
  
  if (!Array.isArray(notes) || !Array.isArray(folders)) return [];
  
  const notesWithType = notes.map(note => ({ ...note, type: 'note' as const }));
  const foldersWithType = folders.map(folder => ({ ...folder, type: 'folder' as const }));
  
  return [...notesWithType, ...foldersWithType];
}, { label: 'allItems$' });

// Selected item query
export const selectedItem$ = computed((get) => {
  const selectedId = get(selectedItemId$);
  const allItems = get(allItems$);
  
  if (!selectedId || !Array.isArray(allItems)) return null;
  return allItems.find(item => item.id === selectedId) || null;
}, { label: 'selectedItem$' });

// Items by parent query
export const createItemsByParentQuery = (parentId?: string) => computed((get) => {
  const allItems = get(allItems$);
  if (!Array.isArray(allItems)) return [];
  return allItems.filter(item => item.parentId === parentId);
}, { label: `itemsByParent$_${parentId || 'root'}` });
