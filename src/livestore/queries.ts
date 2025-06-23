
import { queryDb, computed } from '@livestore/livestore';
import { tables } from './schema';

// Basic entity queries with proper error handling
export const notes$ = queryDb(
  tables.notes.orderBy('createdAt', 'desc'),
  { label: 'notes$' }
);

// Since we're using notes table for both notes and folders, let's create a folders query
export const folders$ = computed((get) => {
  try {
    const allNotes = get(notes$);
    console.log('LiveStore Query Debug - All notes from DB:', allNotes);
    
    // Filter items where type is 'folder'
    const folders = Array.isArray(allNotes) ? allNotes.filter(item => item.type === 'folder') : [];
    console.log('LiveStore Query Debug - Filtered folders:', folders);
    
    return folders;
  } catch (error) {
    console.error('LiveStore Query Debug - Error in folders$:', error);
    return [];
  }
}, { label: 'folders$' });

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

// FIXED: Combined items query with better separation and proper root item handling
export const allItems$ = computed((get) => {
  try {
    const allNotes = get(notes$);
    
    console.log('LiveStore Query Debug - Raw notes from DB:', allNotes);
    
    // Ensure we always work with arrays and handle null/undefined
    const notesArray = Array.isArray(allNotes) ? allNotes : (allNotes ? [allNotes] : []);
    
    if (notesArray.length === 0) {
      console.log('LiveStore Query Debug - No items found in database');
      return [];
    }
    
    // Process all items and add consistent type field
    const allItems = notesArray.map(item => ({
      ...item,
      type: item.type || 'note', // Ensure type is set
      content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content) // Ensure content is string
    }));
    
    console.log('LiveStore Query Debug - All processed items:', allItems.length, 'total items');
    console.log('LiveStore Query Debug - Item breakdown:', {
      notes: allItems.filter(item => item.type === 'note').length,
      folders: allItems.filter(item => item.type === 'folder').length,
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
