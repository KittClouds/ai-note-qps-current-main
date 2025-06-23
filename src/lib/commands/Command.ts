
export interface Command {
  id: string;
  type: string;
  timestamp: number;
  execute(): void;
  undo(): void;
  canMerge?(other: Command): boolean;
  merge?(other: Command): Command;
}

export abstract class BaseCommand implements Command {
  public readonly id: string;
  public readonly timestamp: number;

  constructor(
    public readonly type: string
  ) {
    this.id = crypto.randomUUID();
    this.timestamp = Date.now();
  }

  abstract execute(): void;
  abstract undo(): void;

  canMerge(other: Command): boolean {
    return false;
  }

  merge(other: Command): Command {
    throw new Error('Merge not implemented');
  }
}
