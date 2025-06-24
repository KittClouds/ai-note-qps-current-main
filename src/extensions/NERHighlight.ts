
import { Extension } from '@tiptap/core';
import { Mark } from '@tiptap/core';
import { nerService } from '../lib/ner/nerService';
import { NERSpan } from '../lib/ner/types';

const NERMark = Mark.create({
  name: 'nerHighlight',
  
  addAttributes() {
    return {
      label: {
        default: null,
      },
      score: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-ner-label]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { label, score } = HTMLAttributes;
    return ['span', { 
      'data-ner-label': label,
      'data-ner-score': score,
      class: 'bg-green-100 text-green-800 px-1 rounded text-sm font-medium inline-block mx-1',
      title: `${label} (${Math.round((score || 0) * 100)}% confidence)`,
      ...HTMLAttributes 
    }, 0];
  },
});

export const NERHighlight = Extension.create({
  name: 'nerHighlight',

  addExtensions() {
    return [NERMark];
  },

  addCommands() {
    return {
      runNER: (selectionOnly: boolean = false) => ({ tr, state, dispatch }) => {
        // Start async operation but return boolean immediately
        this.runNERAsync(selectionOnly, tr, state, dispatch);
        return true;
      },

      clearNER: () => ({ tr, state, dispatch }) => {
        const newTr = state.tr;
        
        // Remove all NER marks from the document
        newTr.removeMark(0, state.doc.content.size, state.schema.marks.nerHighlight);
        
        if (dispatch) {
          dispatch(newTr);
        }
        
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-n': () => this.editor.commands.runNER(false),
      'Mod-Shift-c': () => this.editor.commands.clearNER(),
    };
  },

  // Helper method to handle async NER processing
  runNERAsync(selectionOnly: boolean, tr: any, state: any, dispatch: any) {
    setTimeout(async () => {
      try {
        let text: string;
        let from: number;
        let to: number;

        if (selectionOnly && !state.selection.empty) {
          from = state.selection.from;
          to = state.selection.to;
          text = state.doc.textBetween(from, to);
        } else {
          from = 0;
          to = state.doc.content.size;
          text = state.doc.textBetween(from, to);
        }

        if (!text.trim()) {
          return;
        }

        // Analyze text with NER
        const spans = await nerService.analyse(text);
        
        if (spans.length === 0) {
          return;
        }

        // Apply highlights
        const newTr = this.editor.state.tr;
        
        // Sort spans by start position (descending) to apply from end to start
        const sortedSpans = [...spans].sort((a, b) => b.start - a.start);
        
        sortedSpans.forEach((span: NERSpan) => {
          const spanFrom = from + span.start;
          const spanTo = from + span.end;
          
          // Ensure span is within document bounds
          if (spanFrom >= 0 && spanTo <= this.editor.state.doc.content.size && spanFrom < spanTo) {
            newTr.addMark(
              spanFrom,
              spanTo,
              this.editor.state.schema.marks.nerHighlight.create({
                label: span.label,
                score: span.score
              })
            );
          }
        });

        this.editor.view.dispatch(newTr);
      } catch (error) {
        console.error('NER analysis failed:', error);
      }
    }, 0);
  },
});
