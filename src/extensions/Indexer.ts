
import { Extension, RawCommands } from '@tiptap/core';
import debounce from 'lodash.debounce';
import { semanticSearchService } from '@/lib/embeddings/SemanticSearchService';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indexer: {
      indexCurrentNote: () => ReturnType;
    };
  }
}

export const Indexer = Extension.create({
  name: 'indexer',

  addOptions() {
    return {
      debounce: 600, // ms
      getId: (editor: any) => editor.storage.noteId || crypto.randomUUID(),
      getTitle: (editor: any) => editor.storage.noteTitle || 'Untitled',
    };
  },

  addStorage() {
    return {
      noteId: null,
      noteTitle: null,
    };
  },

  addCommands() {
    return {
      indexCurrentNote: () => ({ editor }) => {
        const noteId = this.options.getId(editor);
        const title = this.options.getTitle(editor);
        const text = editor.getText();

        if (noteId && title && text.trim()) {
          // Create a mock note object for the semantic search service
          const mockNote = {
            id: noteId,
            title: title,
            content: JSON.stringify(editor.getJSON()),
            type: 'note' as const,
            parentId: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Index the note asynchronously
          semanticSearchService.syncNote(mockNote).catch(console.error);
        }

        return true;
      },
    };
  },

  // Index once when the editor mounts
  onCreate() {
    if (this.storage.noteId) {
      // Use setTimeout to ensure commands are available
      setTimeout(() => {
        this.editor.commands.indexCurrentNote();
      }, 0);
    }
  },

  // Index on every content change (debounced)
  onUpdate: debounce(function(this: any) {
    if (this.storage.noteId) {
      this.editor.commands.indexCurrentNote();
    }
  }, 600),
});
