
import { Editor } from '@tiptap/core';

export const getPrevText = (editor: Editor, pos: number, chars: number = 5000): string => {
  return editor.state.doc.textBetween(Math.max(0, pos - chars), pos, '\n');
};

export const getSelectedText = (editor: Editor): string => {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, '\n');
};
