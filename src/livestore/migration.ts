
import { events } from './schema';
import { Store } from '@livestore/livestore';

export interface LegacyData {
  notes?: any[];
  clusters?: any[];
  threads?: any[];
  threadMessages?: any[];
  blueprints?: any[];
}

export function migrateLegacyData(store: Store<any>): boolean {
  try {
    // Check if migration has already been completed
    const migrationFlag = localStorage.getItem('livestore-migration-completed');
    if (migrationFlag === 'true') {
      console.log('LiveStore Migration Debug: Migration already completed, skipping');
      return true;
    }

    console.log('LiveStore Migration Debug: Starting migration from localStorage...');

    // Read existing data from localStorage with debugging
    const legacyNotes = localStorage.getItem('notes-app-data');
    console.log('LiveStore Migration Debug: Legacy notes data found:', !!legacyNotes);

    let migratedCount = 0;
    let parsedData = null;

    if (legacyNotes) {
      try {
        parsedData = JSON.parse(legacyNotes);
        console.log('LiveStore Migration Debug: Parsed legacy data:', parsedData);
      } catch (parseError) {
        console.error('LiveStore Migration Debug: Failed to parse legacy data:', parseError);
        return false;
      }

      if (parsedData && parsedData.items && Array.isArray(parsedData.items)) {
        console.log(`LiveStore Migration Debug: Found ${parsedData.items.length} legacy items`);

        parsedData.items.forEach((item: any) => {
          try {
            if (item.type === 'note') {
              store.commit(events.noteCreated({
                id: item.id,
                title: item.title,
                content: item.content || '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":""}]}]}',
                parentId: item.parentId || null,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
              }));
              console.log('LiveStore Migration Debug: Migrated note:', item.id);
              migratedCount++;
            } else if (item.type === 'folder') {
              store.commit(events.folderCreated({
                id: item.id,
                title: item.title,
                parentId: item.parentId || null,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
              }));
              console.log('LiveStore Migration Debug: Migrated folder:', item.id);
              migratedCount++;
            }
          } catch (itemError) {
            console.error('LiveStore Migration Debug: Failed to migrate item:', item.id, itemError);
          }
        });

        // Set initial UI state
        try {
          store.commit(events.uiStateSet({
            selectedItemId: parsedData.selectedItemId || null,
            expandedFolders: Array.from(parsedData.expandedFolders || []),
            toolbarVisible: true
          }));
          console.log('LiveStore Migration Debug: Set initial UI state');
        } catch (uiError) {
          console.error('LiveStore Migration Debug: Failed to set UI state:', uiError);
        }
      }
    }

    // Mark migration as completed
    localStorage.setItem('livestore-migration-completed', 'true');
    
    console.log(`LiveStore Migration Debug: Migration completed successfully! Migrated ${migratedCount} items`);
    
    return true;
  } catch (error) {
    console.error('LiveStore Migration Debug: Migration failed:', error);
    return false;
  }
}
