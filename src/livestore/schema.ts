
import {
  Events,
  makeSchema,
  Schema,
  SessionIdSymbol,
  State
} from '@livestore/livestore';

// Define SQLite tables for our notes app
export const tables = {
  notes: State.SQLite.table({
    name: 'notes',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      title: State.SQLite.text(),
      content: State.SQLite.text(),
      parentId: State.SQLite.text({ nullable: true }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  folders: State.SQLite.table({
    name: 'folders',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      title: State.SQLite.text(),
      parentId: State.SQLite.text({ nullable: true }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  entityAttributes: State.SQLite.table({
    name: 'entityAttributes',
    columns: {
      entityKey: State.SQLite.text({ primaryKey: true }),
      attributes: State.SQLite.json({ schema: Schema.Any }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  // Client-only UI state (doesn't sync)
  uiState: State.SQLite.clientDocument({
    name: 'uiState',
    schema: Schema.Struct({
      selectedItemId: Schema.NullOr(Schema.String),
      expandedFolders: Schema.Array(Schema.String),
      toolbarVisible: Schema.Boolean
    }),
    default: { 
      id: SessionIdSymbol, 
      value: { 
        selectedItemId: null,
        expandedFolders: [],
        toolbarVisible: true
      } 
    }
  })
};

// Define events for state changes
export const events = {
  // Note events
  noteCreated: Events.synced({
    name: 'v1.NoteCreated',
    schema: Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      content: Schema.String,
      parentId: Schema.NullOr(Schema.String),
      createdAt: Schema.String,
      updatedAt: Schema.String
    })
  }),

  noteUpdated: Events.synced({
    name: 'v1.NoteUpdated',
    schema: Schema.Struct({
      id: Schema.String,
      updates: Schema.Any,
      updatedAt: Schema.String
    })
  }),

  noteDeleted: Events.synced({
    name: 'v1.NoteDeleted',
    schema: Schema.Struct({
      id: Schema.String
    })
  }),

  // Folder events
  folderCreated: Events.synced({
    name: 'v1.FolderCreated',
    schema: Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      parentId: Schema.NullOr(Schema.String),
      createdAt: Schema.String,
      updatedAt: Schema.String
    })
  }),

  folderUpdated: Events.synced({
    name: 'v1.FolderUpdated',
    schema: Schema.Struct({
      id: Schema.String,
      updates: Schema.Any,
      updatedAt: Schema.String
    })
  }),

  folderDeleted: Events.synced({
    name: 'v1.FolderDeleted',
    schema: Schema.Struct({
      id: Schema.String
    })
  }),

  // Entity attributes events
  entityAttributesUpdated: Events.synced({
    name: 'v1.EntityAttributesUpdated',
    schema: Schema.Struct({
      entityKey: Schema.String,
      attributes: Schema.Any,
      updatedAt: Schema.String
    })
  }),

  // UI state events (client-only)
  uiStateSet: tables.uiState.set
};

// Create materializers to update database state based on events
const materializers = State.SQLite.materializers(events, {
  'v1.NoteCreated': ({ id, title, content, parentId, createdAt, updatedAt }) =>
    tables.notes.insert({ id, title, content, parentId, createdAt, updatedAt }),

  'v1.NoteUpdated': ({ id, updates, updatedAt }) =>
    tables.notes.update({ ...updates, updatedAt }).where({ id }),

  'v1.NoteDeleted': ({ id }) =>
    tables.notes.delete().where({ id }),

  'v1.FolderCreated': ({ id, title, parentId, createdAt, updatedAt }) =>
    tables.folders.insert({ id, title, parentId, createdAt, updatedAt }),

  'v1.FolderUpdated': ({ id, updates, updatedAt }) =>
    tables.folders.update({ ...updates, updatedAt }).where({ id }),

  'v1.FolderDeleted': ({ id }) =>
    tables.folders.delete().where({ id }),

  'v1.EntityAttributesUpdated': ({ entityKey, attributes, updatedAt }) => [
    tables.entityAttributes.delete().where({ entityKey }),
    tables.entityAttributes.insert({ entityKey, attributes, createdAt: updatedAt, updatedAt })
  ]
});

// Create the state with tables and materializers
const state = State.SQLite.makeState({ tables, materializers });

// Export the complete schema
export const schema = makeSchema({ events, state });
