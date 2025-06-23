
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

// UI state queries with debugging and proper error handling
export const uiState$ = computed((get) => {
  const results = get(queryDb(tables.uiState, { label: 'uiStateRaw$' }));
  console.log('LiveStore Query Debug - UI State raw results:', results);
  
  // Handle both array and direct object results
  let state;
  if (Array.isArray(results) && results.length > 0) {
    state = results[0].value;
  } else if (results && typeof results === 'object' && 'value' in results) {
    state = results.value;
  } else {
    state = {
      selectedItemId: null,
      expandedFolders: [],
      toolbarVisible: true
    };
  }
  
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
  const expanded = Array.isArray(ui?.expandedFolders) ? ui.expandedFolders : [];
  console.log('LiveStore Query Debug - Expanded Folders:', expanded);
  return expanded;
}, { label: 'expandedFolders$' });

export const toolbarVisible$ = computed((get) => {
  const ui = get(uiState$);
  return ui?.toolbarVisible ?? true;
}, { label: 'toolbarVisible$' });

// Combined items query with extensive debugging and proper error handling
export const allItems$ = computed((get) => {
  const notes = get(notes$);
  const folders = get(folders$);
  
  console.log('LiveStore Query Debug - Raw notes from DB:', notes);
  console.log('LiveStore Query Debug - Raw folders from DB:', folders);
  
  // Ensure we always work with arrays
  const notesArray = Array.isArray(notes) ? notes : [];
  const foldersArray = Array.isArray(folders) ? folders : [];
  
  if (notesArray.length === 0 && foldersArray.length === 0) {
    console.log('LiveStore Query Debug - No notes or folders found in database');
  }
  
  const notesWithType = notesArray.map(note => ({ ...note, type: 'note' as const }));
  const foldersWithType = foldersArray.map(folder => ({ ...folder, type: 'folder' as const }));
  
  const allItems = [...notesWithType, ...foldersWithType];
  console.log('LiveStore Query Debug - Combined items:', allItems.length, 'total items');
  
  return allItems;
}, { label: 'allItems$' });

// Selected item query
export const selectedItem$ = computed((get) => {
  const selectedId = get(selectedItemId$);
  const allItems = get(allItems$);
  
  if (!selectedId || !Array.isArray(allItems)) return null;
  return allItems.find(item => item.id === selectedId) || null;
}, { label: 'selectedItem$' });

// Items by parent query - simplified to avoid circular dependencies
export const createItemsByParentQuery = (parentId?: string) => computed((get) => {
  const allItems = get(allItems$);
  if (!Array.isArray(allItems)) return [];
  const filtered = allItems.filter(item => item.parentId === parentId);
  console.log('LiveStore Query Debug - Items by parent', parentId, ':', filtered.length, 'items');
  return filtered;
}, { label: `itemsByParent$_${parentId || 'root'}` });
