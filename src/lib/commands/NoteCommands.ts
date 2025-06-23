
import { BaseCommand, Command } from './Command';
import { events } from '@/livestore/schema';

export class CreateNoteCommand extends BaseCommand {
  private executed = false;

  constructor(
    private store: any,
    private noteData: {
      id: string;
      title: string;
      content: string;
      parentId?: string;
      createdAt: string;
      updatedAt: string;
    }
  ) {
    super('CREATE_NOTE');
  }

  execute(): void {
    if (!this.executed) {
      this.store.commit(events.noteCreated({
        id: this.noteData.id,
        title: this.noteData.title,
        content: this.noteData.content,
        parentId: this.noteData.parentId || null,
        createdAt: this.noteData.createdAt,
        updatedAt: this.noteData.updatedAt
      }));
      this.executed = true;
    }
  }

  undo(): void {
    if (this.executed) {
      this.store.commit(events.noteDeleted({ id: this.noteData.id }));
      this.executed = false;
    }
  }
}

export class UpdateNoteContentCommand extends BaseCommand {
  private previousContent: string;

  constructor(
    private store: any,
    private noteId: string,
    private newContent: string,
    previousContent: string
  ) {
    super('UPDATE_NOTE_CONTENT');
    this.previousContent = previousContent;
  }

  execute(): void {
    this.store.commit(events.noteUpdated({
      id: this.noteId,
      updates: { content: this.newContent },
      updatedAt: new Date().toISOString()
    }));
  }

  undo(): void {
    this.store.commit(events.noteUpdated({
      id: this.noteId,
      updates: { content: this.previousContent },
      updatedAt: new Date().toISOString()
    }));
  }

  canMerge(other: Command): boolean {
    if (other.type !== 'UPDATE_NOTE_CONTENT') return false;
    const otherCmd = other as UpdateNoteContentCommand;
    return otherCmd.noteId === this.noteId && 
           Math.abs(this.timestamp - other.timestamp) < 1000; // 1 second window
  }

  merge(other: Command): Command {
    const otherCmd = other as UpdateNoteContentCommand;
    return new UpdateNoteContentCommand(
      this.store,
      this.noteId,
      otherCmd.newContent,
      this.previousContent
    );
  }
}

export class DeleteNoteCommand extends BaseCommand {
  private noteData: any;

  constructor(
    private store: any,
    private noteId: string,
    noteData: any
  ) {
    super('DELETE_NOTE');
    this.noteData = noteData;
  }

  execute(): void {
    this.store.commit(events.noteDeleted({ id: this.noteId }));
  }

  undo(): void {
    this.store.commit(events.noteCreated(this.noteData));
  }
}
