
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import tippy from 'tippy.js';
import { bm25Service } from '@/lib/bm25/bm25Service';

export interface BM25SearchHit {
  id: string;
  title: string;
  preview: string;
  score?: number;
}

export const BM25SearchCommand = Extension.create({
  name: 'bm25SearchCommand',

  addOptions() {
    return {
      trigger: '??',
      paletteKeys: ['Mod-k'],
      fetchHits: async (query: string): Promise<BM25SearchHit[]> => {
        if (!query.trim()) return [];
        
        try {
          const results = await bm25Service.search(query, 5);
          return results.map(result => ({
            id: result.noteId,
            title: result.title,
            preview: result.content.substring(0, 100) + '...',
            score: result.score,
          }));
        } catch (error) {
          console.error('BM25 search failed:', error);
          return [];
        }
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      [this.options.paletteKeys[0]]: () => {
        // Start suggestion manually for palette mode
        return this.editor.commands.focus();
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: this.options.trigger,
        allowSpaces: true,
        startOfLine: false,

        items: async ({ query }) => {
          return await this.options.fetchHits(query);
        },

        render: () => {
          let popup: any;
          let selectedIndex = 0;

          return {
            onStart: (props: any) => {
              selectedIndex = 0;
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                trigger: 'manual',
                interactive: true,
                placement: 'bottom-start',
                content: renderList(props.items, selectedIndex, props.command),
                theme: 'search-palette',
              });
              popup.show();
            },

            onUpdate: (props: any) => {
              popup?.setProps({ 
                content: renderList(props.items, selectedIndex, props.command) 
              });
            },

            onKeyDown: (props: any) => {
              if (props.event.key === 'ArrowUp') {
                selectedIndex = Math.max(0, selectedIndex - 1);
                popup?.setProps({ 
                  content: renderList(props.items, selectedIndex, props.command) 
                });
                return true;
              }

              if (props.event.key === 'ArrowDown') {
                selectedIndex = Math.min(props.items.length - 1, selectedIndex + 1);
                popup?.setProps({ 
                  content: renderList(props.items, selectedIndex, props.command) 
                });
                return true;
              }

              if (props.event.key === 'Enter') {
                const item = props.items[selectedIndex];
                if (item) {
                  props.command(item);
                }
                return true;
              }

              return false;
            },

            onExit: () => {
              popup?.destroy();
            },
          };
        },

        command: ({ editor, range, props }: any) => {
          const wikiLinkNode = editor.schema.nodes.wikilink;
          if (!wikiLinkNode) return false;

          const node = wikiLinkNode.create({ target: props.title });
          editor.chain().focus().deleteRange(range).insertContent(node).run();
          return true;
        },
      }),
    ];
  },
});

function renderList(items: BM25SearchHit[], selectedIndex: number, command: any) {
  const box = document.createElement('div');
  box.className = 'search-palette bg-background border border-border rounded-lg shadow-lg p-2 max-w-md';
  
  if (items.length === 0) {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'px-3 py-2 text-muted-foreground text-sm';
    emptyRow.textContent = 'No results found';
    box.appendChild(emptyRow);
    return box;
  }

  items.forEach((item: BM25SearchHit, i: number) => {
    const row = document.createElement('div');
    row.className = `px-3 py-2 cursor-pointer rounded text-sm transition-colors ${
      i === selectedIndex 
        ? 'bg-accent text-accent-foreground' 
        : 'hover:bg-accent/50'
    }`;
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'font-medium truncate';
    titleDiv.textContent = item.title;
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'text-xs text-muted-foreground mt-1 truncate';
    previewDiv.textContent = item.preview;

    if (item.score) {
      const scoreDiv = document.createElement('div');
      scoreDiv.className = 'text-xs text-primary font-medium mt-1';
      scoreDiv.textContent = `BM25: ${item.score.toFixed(2)}`;
      row.appendChild(scoreDiv);
    }
    
    row.appendChild(titleDiv);
    row.appendChild(previewDiv);
    
    row.onclick = () => command(item);
    box.appendChild(row);
  });

  return box;
}
