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

  // Rich content tables
  attachments: State.SQLite.table({
    name: 'attachments',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      fileName: State.SQLite.text(),
      fileSize: State.SQLite.integer({ nullable: true }),
      mimeType: State.SQLite.text({ nullable: true }),
      url: State.SQLite.text(),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  images: State.SQLite.table({
    name: 'images',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      src: State.SQLite.text(),
      alt: State.SQLite.text({ nullable: true }),
      title: State.SQLite.text({ nullable: true }),
      width: State.SQLite.integer({ nullable: true }),
      height: State.SQLite.integer({ nullable: true }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  videos: State.SQLite.table({
    name: 'videos',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      src: State.SQLite.text(),
      title: State.SQLite.text({ nullable: true }),
      controls: State.SQLite.boolean({ default: true }),
      width: State.SQLite.integer({ nullable: true }),
      height: State.SQLite.integer({ nullable: true }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  links: State.SQLite.table({
    name: 'links',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      href: State.SQLite.text(),
      text: State.SQLite.text({ nullable: true }),
      title: State.SQLite.text({ nullable: true }),
      target: State.SQLite.text({ nullable: true }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  mentions: State.SQLite.table({
    name: 'mentions',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      mentionId: State.SQLite.text(),
      label: State.SQLite.text(),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  tables: State.SQLite.table({
    name: 'tables',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      rows: State.SQLite.integer(),
      cols: State.SQLite.integer(),
      content: State.SQLite.json({ schema: Schema.Any }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  formulas: State.SQLite.table({
    name: 'formulas',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      latex: State.SQLite.text(),
      displayMode: State.SQLite.boolean({ default: false }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  drawings: State.SQLite.table({
    name: 'drawings',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      type: State.SQLite.text(), // 'excalidraw' or 'drawer'
      data: State.SQLite.json({ schema: Schema.Any }),
      preview: State.SQLite.text({ nullable: true }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  diagrams: State.SQLite.table({
    name: 'diagrams',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      code: State.SQLite.text(),
      theme: State.SQLite.text({ nullable: true }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  tweets: State.SQLite.table({
    name: 'tweets',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      tweetId: State.SQLite.text(),
      url: State.SQLite.text(),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  codeBlocks: State.SQLite.table({
    name: 'codeBlocks',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      language: State.SQLite.text({ nullable: true }),
      code: State.SQLite.text(),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  tasks: State.SQLite.table({
    name: 'tasks',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      text: State.SQLite.text(),
      checked: State.SQLite.boolean({ default: false }),
      nested: State.SQLite.boolean({ default: false }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  iframes: State.SQLite.table({
    name: 'iframes',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      src: State.SQLite.text(),
      width: State.SQLite.integer({ nullable: true }),
      height: State.SQLite.integer({ nullable: true }),
      allowFullscreen: State.SQLite.boolean({ default: false }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  quotes: State.SQLite.table({
    name: 'quotes',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      content: State.SQLite.text(),
      author: State.SQLite.text({ nullable: true }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  // Custom extension content
  wikiLinks: State.SQLite.table({
    name: 'wikiLinks',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      target: State.SQLite.text(),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  tags: State.SQLite.table({
    name: 'tags',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      tag: State.SQLite.text(),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  entities: State.SQLite.table({
    name: 'entities',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      kind: State.SQLite.text(),
      label: State.SQLite.text(),
      attributes: State.SQLite.json({ schema: Schema.Any, nullable: true }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  triples: State.SQLite.table({
    name: 'triples',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      subject: State.SQLite.json({ schema: Schema.Any }),
      predicate: State.SQLite.text(),
      object: State.SQLite.json({ schema: Schema.Any }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  crossLinks: State.SQLite.table({
    name: 'crossLinks',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      noteId: State.SQLite.text(),
      targetNoteId: State.SQLite.text(),
      label: State.SQLite.text({ nullable: true }),
      createdAt: State.SQLite.text(),
      updatedAt: State.SQLite.text()
    }
  }),

  // NEW: HNSW graph snapshots metadata table
  hnswSnapshots: State.SQLite.table({
    name: 'hnsw_graph_snapshots',
    columns: {
      fileName: State.SQLite.text({ primaryKey: true }),
      checksum: State.SQLite.text(),
      createdAt: State.SQLite.text()
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

// Define events for state changes - existing events plus rich content events
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

  // Rich content events
  richContentSynced: Events.synced({
    name: 'v1.RichContentSynced',
    schema: Schema.Struct({
      noteId: Schema.String,
      contentType: Schema.String,
      items: Schema.Array(Schema.Any),
      updatedAt: Schema.String
    })
  }),

  richContentCleared: Events.synced({
    name: 'v1.RichContentCleared',
    schema: Schema.Struct({
      noteId: Schema.String,
      contentTypes: Schema.Array(Schema.String),
      updatedAt: Schema.String
    })
  }),

  // NEW: HNSW snapshot events
  hnswGraphSnapshotCreated: Events.synced({
    name: 'v1.HnswGraphSnapshotCreated',
    schema: Schema.Struct({
      fileName: Schema.String,
      checksum: Schema.String,
      createdAt: Schema.String
    })
  }),

  hnswSnapshotDeleted: Events.synced({
    name: 'v1.HnswSnapshotDeleted',
    schema: Schema.Struct({
      fileName: Schema.String
    })
  }),

  // UI state events (client-only)
  uiStateSet: tables.uiState.set
};

// Create materializers with rich content support
const materializers = State.SQLite.materializers(events, {
  'v1.NoteCreated': ({ id, title, content, parentId, createdAt, updatedAt }) => {
    console.log('LiveStore Materializer Debug - Note Created:', { id, title, content, parentId, createdAt, updatedAt });
    const result = tables.notes.insert({ id, title, content, parentId, createdAt, updatedAt });
    console.log('LiveStore Materializer Debug - Note insert result:', result);
    return result;
  },

  'v1.NoteUpdated': ({ id, updates, updatedAt }) => {
    console.log('LiveStore Materializer Debug - Note Updated:', { id, updates, updatedAt });
    const result = tables.notes.update({ ...updates, updatedAt }).where({ id });
    console.log('LiveStore Materializer Debug - Note update result:', result);
    return result;
  },

  'v1.NoteDeleted': ({ id }) => {
    console.log('LiveStore Materializer Debug - Note Deleted:', { id });
    const result = tables.notes.delete().where({ id });
    console.log('LiveStore Materializer Debug - Note delete result:', result);
    return result;
  },

  'v1.FolderCreated': ({ id, title, parentId, createdAt, updatedAt }) => {
    console.log('LiveStore Materializer Debug - Folder Created:', { id, title, parentId, createdAt, updatedAt });
    const result = tables.folders.insert({ id, title, parentId, createdAt, updatedAt });
    console.log('LiveStore Materializer Debug - Folder insert result:', result);
    return result;
  },

  'v1.FolderUpdated': ({ id, updates, updatedAt }) => {
    console.log('LiveStore Materializer Debug - Folder Updated:', { id, updates, updatedAt });
    const result = tables.folders.update({ ...updates, updatedAt }).where({ id });
    console.log('LiveStore Materializer Debug - Folder update result:', result);
    return result;
  },

  'v1.FolderDeleted': ({ id }) => {
    console.log('LiveStore Materializer Debug - Folder Deleted:', { id });
    const result = tables.folders.delete().where({ id });
    console.log('LiveStore Materializer Debug - Folder delete result:', result);
    return result;
  },

  'v1.EntityAttributesUpdated': ({ entityKey, attributes, updatedAt }) => {
    console.log('LiveStore Materializer Debug - Entity Attributes Updated:', { entityKey, attributes, updatedAt });
    const result = [
      tables.entityAttributes.delete().where({ entityKey }),
      tables.entityAttributes.insert({ entityKey, attributes, createdAt: updatedAt, updatedAt })
    ];
    console.log('LiveStore Materializer Debug - Entity attributes result:', result);
    return result;
  },

  // Rich content materializers
  'v1.RichContentSynced': ({ noteId, contentType, items, updatedAt }) => {
    console.log('LiveStore Materializer Debug - Rich Content Synced:', { noteId, contentType, items: items.length, updatedAt });
    
    const operations = [];
    
    // Clear existing content of this type for this note
    switch (contentType) {
      case 'attachments':
        operations.push(tables.attachments.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.attachments.insert({ ...item, noteId, updatedAt })));
        break;
      case 'images':
        operations.push(tables.images.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.images.insert({ ...item, noteId, updatedAt })));
        break;
      case 'videos':
        operations.push(tables.videos.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.videos.insert({ ...item, noteId, updatedAt })));
        break;
      case 'links':
        operations.push(tables.links.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.links.insert({ ...item, noteId, updatedAt })));
        break;
      case 'mentions':
        operations.push(tables.mentions.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.mentions.insert({ ...item, noteId, updatedAt })));
        break;
      case 'tables':
        operations.push(tables.tables.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.tables.insert({ ...item, noteId, updatedAt })));
        break;
      case 'formulas':
        operations.push(tables.formulas.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.formulas.insert({ ...item, noteId, updatedAt })));
        break;
      case 'drawings':
        operations.push(tables.drawings.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.drawings.insert({ ...item, noteId, updatedAt })));
        break;
      case 'diagrams':
        operations.push(tables.diagrams.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.diagrams.insert({ ...item, noteId, updatedAt })));
        break;
      case 'tweets':
        operations.push(tables.tweets.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.tweets.insert({ ...item, noteId, updatedAt })));
        break;
      case 'codeBlocks':
        operations.push(tables.codeBlocks.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.codeBlocks.insert({ ...item, noteId, updatedAt })));
        break;
      case 'tasks':
        operations.push(tables.tasks.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.tasks.insert({ ...item, noteId, updatedAt })));
        break;
      case 'iframes':
        operations.push(tables.iframes.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.iframes.insert({ ...item, noteId, updatedAt })));
        break;
      case 'quotes':
        operations.push(tables.quotes.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.quotes.insert({ ...item, noteId, updatedAt })));
        break;
      case 'wikiLinks':
        operations.push(tables.wikiLinks.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.wikiLinks.insert({ ...item, noteId, updatedAt })));
        break;
      case 'tags':
        operations.push(tables.tags.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.tags.insert({ ...item, noteId, updatedAt })));
        break;
      case 'entities':
        operations.push(tables.entities.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.entities.insert({ ...item, noteId, updatedAt })));
        break;
      case 'triples':
        operations.push(tables.triples.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.triples.insert({ ...item, noteId, updatedAt })));
        break;
      case 'crossLinks':
        operations.push(tables.crossLinks.delete().where({ noteId }));
        items.forEach(item => operations.push(tables.crossLinks.insert({ ...item, noteId, updatedAt })));
        break;
    }
    
    return operations;
  },

  'v1.RichContentCleared': ({ noteId, contentTypes, updatedAt }) => {
    console.log('LiveStore Materializer Debug - Rich Content Cleared:', { noteId, contentTypes, updatedAt });
    
    const operations = [];
    contentTypes.forEach(contentType => {
      switch (contentType) {
        case 'attachments': operations.push(tables.attachments.delete().where({ noteId })); break;
        case 'images': operations.push(tables.images.delete().where({ noteId })); break;
        case 'videos': operations.push(tables.videos.delete().where({ noteId })); break;
        case 'links': operations.push(tables.links.delete().where({ noteId })); break;
        case 'mentions': operations.push(tables.mentions.delete().where({ noteId })); break;
        case 'tables': operations.push(tables.tables.delete().where({ noteId })); break;
        case 'formulas': operations.push(tables.formulas.delete().where({ noteId })); break;
        case 'drawings': operations.push(tables.drawings.delete().where({ noteId })); break;
        case 'diagrams': operations.push(tables.diagrams.delete().where({ noteId })); break;
        case 'tweets': operations.push(tables.tweets.delete().where({ noteId })); break;
        case 'codeBlocks': operations.push(tables.codeBlocks.delete().where({ noteId })); break;
        case 'tasks': operations.push(tables.tasks.delete().where({ noteId })); break;
        case 'iframes': operations.push(tables.iframes.delete().where({ noteId })); break;
        case 'quotes': operations.push(tables.quotes.delete().where({ noteId })); break;
        case 'wikiLinks': operations.push(tables.wikiLinks.delete().where({ noteId })); break;
        case 'tags': operations.push(tables.tags.delete().where({ noteId })); break;
        case 'entities': operations.push(tables.entities.delete().where({ noteId })); break;
        case 'triples': operations.push(tables.triples.delete().where({ noteId })); break;
        case 'crossLinks': operations.push(tables.crossLinks.delete().where({ noteId })); break;
      }
    });
    
    return operations;
  },

  // NEW: HNSW snapshot materializers
  'v1.HnswGraphSnapshotCreated': ({ fileName, checksum, createdAt }) => {
    console.log('LiveStore Materializer Debug - HNSW Snapshot Created:', { fileName, checksum, createdAt });
    const result = tables.hnswSnapshots.insert({ fileName, checksum, createdAt });
    console.log('LiveStore Materializer Debug - HNSW snapshot insert result:', result);
    return result;
  },

  'v1.HnswSnapshotDeleted': ({ fileName }) => {
    console.log('LiveStore Materializer Debug - HNSW Snapshot Deleted:', { fileName });
    const result = tables.hnswSnapshots.delete().where({ fileName });
    console.log('LiveStore Materializer Debug - HNSW snapshot delete result:', result);
    return result;
  }
});

// Create the state with tables and materializers
const state = State.SQLite.makeState({ tables, materializers });

// Export the complete schema
export const schema = makeSchema({ events, state });
