
import { Command } from './Command';

export interface HistoryState {
  commands: Command[];
  currentIndex: number;
  maxSize: number;
}

export class CommandHistory {
  private commands: Command[] = [];
  private currentIndex = -1;
  private readonly maxSize: number;
  private listeners: Array<(state: HistoryState) => void> = [];

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  execute(command: Command): void {
    // Try to merge with the last command if possible
    if (this.currentIndex >= 0) {
      const lastCommand = this.commands[this.currentIndex];
      if (lastCommand.canMerge && lastCommand.canMerge(command)) {
        const merged = lastCommand.merge!(command);
        this.commands[this.currentIndex] = merged;
        command.execute();
        this.notifyListeners();
        return;
      }
    }

    // Remove any commands after current index (for when we're in the middle of history)
    if (this.currentIndex < this.commands.length - 1) {
      this.commands = this.commands.slice(0, this.currentIndex + 1);
    }

    // Add new command
    this.commands.push(command);
    this.currentIndex++;

    // Maintain max size
    if (this.commands.length > this.maxSize) {
      this.commands.shift();
      this.currentIndex--;
    }

    command.execute();
    this.notifyListeners();
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    const command = this.commands[this.currentIndex];
    command.undo();
    this.currentIndex--;
    this.notifyListeners();
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    this.currentIndex++;
    const command = this.commands[this.currentIndex];
    command.execute();
    this.notifyListeners();
    return true;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.commands.length - 1;
  }

  getState(): HistoryState {
    return {
      commands: [...this.commands],
      currentIndex: this.currentIndex,
      maxSize: this.maxSize
    };
  }

  clear(): void {
    this.commands = [];
    this.currentIndex = -1;
    this.notifyListeners();
  }

  subscribe(listener: (state: HistoryState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}
