
import { type Editor, Mark, markInputRule, markPasteRule, mergeAttributes } from "@tiptap/core";

export interface AIHighlightOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    AIHighlight: {
      /**
       * Set a AIHighlight mark
       */
      setAIHighlight: (attributes?: { color: string }) => ReturnType;
      /**
       * Toggle a AIHighlight mark
       */
      toggleAIHighlight: (attributes?: { color: string }) => ReturnType;
      /**
       * Unset a AIHighlight mark
       */
      unsetAIHighlight: () => ReturnType;
    };
  }
}

export const inputRegex = /(?:^|\s)((?:==)((?:[^~=]+))(?:==))$/;
export const pasteRegex = /(?:^|\s)((?:==)((?:[^~=]+))(?:==))/g;

export const AIHighlight = Mark.create<AIHighlightOptions>({
  name: "ai-highlight",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-color") || element.style.backgroundColor,
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {};
          }

          return {
            "data-color": attributes.color,
            style: `background-color: ${attributes.color}; color: inherit`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "mark",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setAIHighlight:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleAIHighlight:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetAIHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-h": () => this.editor.commands.toggleAIHighlight(),
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: inputRegex,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: pasteRegex,
        type: this.type,
      }),
    ];
  },
});

export const removeAIHighlight = (editor: Editor) => {
  if (!editor || !editor.isEditable || editor.isDestroyed) {
    return;
  }
  
  try {
    editor.chain().focus().unsetAIHighlight().run();
  } catch (error) {
    console.warn('Failed to remove AI highlight:', error);
  }
};

export const addAIHighlight = (editor: Editor, color?: string) => {
  if (!editor || !editor.isEditable || editor.isDestroyed) {
    return;
  }
  
  try {
    editor
      .chain()
      .focus()
      .setAIHighlight({ color: color ?? "#c1ecf970" })
      .run();
  } catch (error) {
    console.warn('Failed to add AI highlight:', error);
  }
};
