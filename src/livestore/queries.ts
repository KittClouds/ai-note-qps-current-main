
import { queryDb, computed } from '@livestore/livestore';
import { tables } from './schema';

// Basic entity queries with debugging
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

// UI state queries with debugging
export const uiState$ = computed((get) => {
  const results = get(queryDb(tables.uiState, { label: 'uiStateRaw$' }));
  console.log('LiveStore Query Debug - UI State raw results:', results);
  
  const state = Array.isArray(results) && results.length > 0 ? results[0].value : {
    selectedItemId: null,
    expandedFolders: [],
    toolbarVisible: true
  };
  
  console.log('LiveStore Query Debug - UI State processed:', state);
  return state;
}, { label: 'uiState$' });

export const selectedItemId$ = computed((get) => {
  const ui = get(uiState$);
  const selectedId = ui?.selectedItemId || null;
  console.log('LiveStore Query Debug - Selected Item ID:', selectedId);
  return selectedId;
}, { label: 'selectedItemId$' });

export const expandedFolders$ = computed((get) => {
  const ui = get(uiState$);
  const expanded = ui?.expandedFolders || [];
  console.log('LiveStore Query Debug - Expanded Folders:', expanded);
  return expanded;
}, { label: 'expandedFolders$' });

export const toolbarVisible$ = computed((get) => {
  const ui = get(uiState$);
  return ui?.toolbarVisible ?? true;
}, { label: 'toolbarVisible$' });

// Combined items query with extensive debugging
export const allItems$ = computed((get) => {
  const notes = get(notes$);
  const folders = get(folders$);
  
  console.log('LiveStore Query Debug - Raw notes from DB:', notes);
  console.log('LiveStore Query Debug - Raw folders from DB:', folders);
  
  if (!Array.isArray(notes) || !Array.isArray(folders)) {
    console.warn('LiveStore Query Debug - Notes or folders not arrays:', { notes, folders });
    return [];
  }
  
  const notesWithType = notes.map(note => ({ ...note, type: 'note' as const }));
  const foldersWithType = folders.map(folder => ({ ...folder, type: 'folder' as const }));
  
  const allItems = [...notesWithType, ...foldersWithType];
  console.log('LiveStore Query Debug - Combined items:', allItems);
  
  return allItems;
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
  const filtered = allItems.filter(item => item.parentId === parentId);
  console.log('LiveStore Query Debug - Items by parent', parentId, ':', filtered);
  return filtered;
}, { label: `itemsByParent$_${parentId || 'root'}` });
