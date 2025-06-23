
import { queryDb, computed } from '@livestore/livestore';
import { tables } from './schema';

// Basic entity queries with proper error handling
export const notes$ = queryDb(
  tables.notes.orderBy('createdAt', 'desc'),
  { label: 'notes$' }
);

// FIXED: Use the actual folders table instead of filtering notes
export const folders$ = queryDb(
  tables.folders.orderBy('createdAt', 'desc'),
  { label: 'folders$' }
);

export const entityAttributes$ = queryDb(
  tables.entityAttributes.orderBy('updatedAt', 'desc'),
  { label: 'entityAttributes$' }
);

// UI state queries with proper error handling
export const uiState$ = computed((get) => {
  try {
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
  } catch (error) {
    console.error('LiveStore Query Debug - Error in uiState$:', error);
    return {
      selectedItemId: null,
      expandedFolders: [],
      toolbarVisible: true
    };
  }
}, { label: 'uiState$' });

export const selectedItemId$ = computed((get) => {
  try {
    const ui = get(uiState$);
    const selectedId = ui?.selectedItemId || null;
    console.log('LiveStore Query Debug - Selected Item ID:', selectedId);
    return selectedId;
  } catch (error) {
    console.error('LiveStore Query Debug - Error in selectedItemId$:', error);
    return null;
  }
}, { label: 'selectedItemId$' });

export const expandedFolders$ = computed((get) => {
  try {
    const ui = get(uiState$);
    const expanded = Array.isArray(ui?.expandedFolders) ? ui.expandedFolders : [];
    console.log('LiveStore Query Debug - Expanded Folders:', expanded);
    return expanded;
  } catch (error) {
    console.error('LiveStore Query Debug - Error in expandedFolders$:', error);
    return [];
  }
}, { label: 'expandedFolders$' });

export const toolbarVisible$ = computed((get) => {
  try {
    const ui = get(uiState$);
    return ui?.toolbarVisible ?? true;
  } catch (error) {
    console.error('LiveStore Query Debug - Error in toolbarVisible$:', error);
    return true;
  }
}, { label: 'toolbarVisible$' });

// FIXED: Combined items query that properly merges notes and folders from their respective tables
export const allItems$ = computed((get) => {
  try {
    const allNotes = get(notes$);
    const allFolders = get(folders$);
    
    console.log('LiveStore Query Debug - Raw notes from notes table:', allNotes);
    console.log('LiveStore Query Debug - Raw folders from folders table:', allFolders);
    
    // Ensure we always work with arrays
    const notesArray = Array.isArray(allNotes) ? allNotes : (allNotes ? [allNotes] : []);
    const foldersArray = Array.isArray(allFolders) ? allFolders : (allFolders ? [allFolders] : []);
    
    // Process notes - add type field and ensure content is string
    const processedNotes = notesArray.map(note => ({
      ...note,
      type: 'note' as const,
      content: typeof note.content === 'string' ? note.content : JSON.stringify(note.content)
    }));
    
    // Process folders - add type field
    const processedFolders = foldersArray.map(folder => ({
      ...folder,
      type: 'folder' as const,
      content: '' // Folders don't have content
    }));
    
    // Combine all items
    const allItems = [...processedNotes, ...processedFolders];
    
    console.log('LiveStore Query Debug - Combined items:', allItems.length, 'total items');
    console.log('LiveStore Query Debug - Item breakdown:', {
      notes: processedNotes.length,
      folders: processedFolders.length,
      rootItems: allItems.filter(item => item.parentId === null || item.parentId === undefined).length
    });
    
    return allItems;
  } catch (error) {
    console.error('LiveStore Query Debug - Error in allItems$:', error);
    return [];
  }
}, { label: 'allItems$' });

// Selected item query with error handling
export const selectedItem$ = computed((get) => {
  try {
    const selectedId = get(selectedItemId$);
    const allItems = get(allItems$);
    
    if (!selectedId || !Array.isArray(allItems)) return null;
    return allItems.find(item => item.id === selectedId) || null;
  } catch (error) {
    console.error('LiveStore Query Debug - Error in selectedItem$:', error);
    return null;
  }
}, { label: 'selectedItem$' });

// Items by parent query with error handling
export const createItemsByParentQuery = (parentId?: string) => computed((get) => {
  try {
    const allItems = get(allItems$);
    if (!Array.isArray(allItems)) {
      console.warn('LiveStore Query Debug - allItems is not an array:', allItems);
      return [];
    }
    
    // FIXED: Proper root item filtering
    const filtered = allItems.filter(item => {
      if (parentId === undefined) {
        // Root level: include items with null or undefined parentId
        return item.parentId === null || item.parentId === undefined;
      } else {
        // Specific parent: exact match
        return item.parentId === parentId;
      }
    });
    
    console.log('LiveStore Query Debug - Items by parent', parentId, ':', filtered.length, 'items');
    return filtered;
  } catch (error) {
    console.error('LiveStore Query Debug - Error in createItemsByParentQuery:', error);
    return [];
  }
}, { label: `itemsByParent$_${parentId || 'root'}` });
