
import { events } from './schema';
import { Store } from '@livestore/livestore';

export interface LegacyData {
  notes?: any[];
  entityAttributes?: Record<string, any>;
  toolbarVisible?: boolean;
  selectedItemId?: string;
  expandedFolders?: string[];
}

export function migrateLegacyData(store: Store<any>): boolean {
  try {
    // Check if migration has already been completed
    const migrationFlag = localStorage.getItem('livestore-migration-completed');
    if (migrationFlag === 'true') {
      console.log('LiveStore: Migration already completed, skipping');
      return true;
    }

    console.log('LiveStore: Starting migration from localStorage...');

    // Read existing data from localStorage
    const legacyNotesData = localStorage.getItem('notes-app-data');
    const legacyEntityAttributes = localStorage.getItem('notes-app-entity-attributes');
    const legacyToolbarVisible = localStorage.getItem('editor-toolbar-visible');

    let migratedCount = 0;

    // Migrate notes and folders
    if (legacyNotesData) {
      const data = JSON.parse(legacyNotesData);
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item: any) => {
          if (item.type === 'note') {
            store.commit(events.noteCreated({
              id: item.id,
              title: item.title,
              content: item.content,
              parentId: item.parentId || null,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            }));
          } else if (item.type === 'folder') {
            store.commit(events.folderCreated({
              id: item.id,
              title: item.title,
              parentId: item.parentId || null,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            }));
          }
          migratedCount++;
        });
        console.log(`LiveStore: Migrated ${data.items.length} items`);
      }

      // Set initial UI state
      store.commit(events.uiStateSet({
        selectedItemId: data.selectedItemId || null,
        expandedFolders: Array.from(data.expandedFolders || []),
        toolbarVisible: legacyToolbarVisible ? JSON.parse(legacyToolbarVisible) : true
      }));
    }

    // Migrate entity attributes
    if (legacyEntityAttributes) {
      const attributes = JSON.parse(legacyEntityAttributes);
      Object.entries(attributes).forEach(([entityKey, attrs]) => {
        store.commit(events.entityAttributesUpdated({
          entityKey,
          attributes: attrs,
          updatedAt: new Date().toISOString()
        }));
        migratedCount++;
      });
      console.log(`LiveStore: Migrated ${Object.keys(attributes).length} entity attributes`);
    }

    // Mark migration as completed
    localStorage.setItem('livestore-migration-completed', 'true');
    
    console.log(`LiveStore: Migration completed successfully! Migrated ${migratedCount} items`);
    
    return true;
  } catch (error) {
    console.error('LiveStore: Migration failed:', error);
    return false;
  }
}
