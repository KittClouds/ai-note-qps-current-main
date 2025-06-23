
export interface Delta {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  length?: number;
  content?: string;
  attributes?: Record<string, any>;
}

export interface DeltaOperation {
  noteId: string;
  deltas: Delta[];
  timestamp: number;
  checksum: string;
}

export class DeltaCompressor {
  static compress(oldContent: string, newContent: string): Delta[] {
    const deltas: Delta[] = [];
    let oldIndex = 0;
    let newIndex = 0;

    // Simple diff algorithm - can be enhanced with more sophisticated algorithms
    while (oldIndex < oldContent.length || newIndex < newContent.length) {
      if (oldIndex >= oldContent.length) {
        // Insert remaining new content
        deltas.push({
          id: crypto.randomUUID(),
          type: 'insert',
          content: newContent.slice(newIndex)
        });
        break;
      }

      if (newIndex >= newContent.length) {
        // Delete remaining old content
        deltas.push({
          id: crypto.randomUUID(),
          type: 'delete',
          length: oldContent.length - oldIndex
        });
        break;
      }

      if (oldContent[oldIndex] === newContent[newIndex]) {
        // Find length of common sequence
        let retainLength = 0;
        while (
          oldIndex + retainLength < oldContent.length &&
          newIndex + retainLength < newContent.length &&
          oldContent[oldIndex + retainLength] === newContent[newIndex + retainLength]
        ) {
          retainLength++;
        }

        if (retainLength > 0) {
          deltas.push({
            id: crypto.randomUUID(),
            type: 'retain',
            length: retainLength
          });
          oldIndex += retainLength;
          newIndex += retainLength;
        }
      } else {
        // Find insertion point
        let insertEnd = newIndex;
        let deleteEnd = oldIndex;

        // Simple approach: find next common character
        while (insertEnd < newContent.length && deleteEnd < oldContent.length) {
          if (newContent[insertEnd] === oldContent[deleteEnd]) {
            break;
          }
          insertEnd++;
          if (insertEnd >= newContent.length) {
            deleteEnd++;
            insertEnd = newIndex;
          }
        }

        // Add delete operation if needed
        if (deleteEnd > oldIndex) {
          deltas.push({
            id: crypto.randomUUID(),
            type: 'delete',
            length: deleteEnd - oldIndex
          });
          oldIndex = deleteEnd;
        }

        // Add insert operation if needed
        if (insertEnd > newIndex) {
          deltas.push({
            id: crypto.randomUUID(),
            type: 'insert',
            content: newContent.slice(newIndex, insertEnd)
          });
          newIndex = insertEnd;
        }
      }
    }

    return deltas;
  }

  static apply(content: string, deltas: Delta[]): string {
    let result = '';
    let contentIndex = 0;

    for (const delta of deltas) {
      switch (delta.type) {
        case 'retain':
          result += content.slice(contentIndex, contentIndex + (delta.length || 0));
          contentIndex += delta.length || 0;
          break;
        case 'insert':
          result += delta.content || '';
          break;
        case 'delete':
          contentIndex += delta.length || 0;
          break;
      }
    }

    return result;
  }

  static createOperation(noteId: string, deltas: Delta[]): DeltaOperation {
    const operation: DeltaOperation = {
      noteId,
      deltas,
      timestamp: Date.now(),
      checksum: this.calculateChecksum(deltas)
    };
    return operation;
  }

  private static calculateChecksum(deltas: Delta[]): string {
    const deltaString = JSON.stringify(deltas);
    return btoa(deltaString).slice(0, 16);
  }
}
