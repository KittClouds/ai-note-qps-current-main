
import { MergeVacuumService } from './MergeVacuumService';
import { ActivityTracker } from './ActivityTracker';
import { SyncQueue } from './SyncQueue';
import { DeltaOperation } from './DeltaCompression';

export class SyncManager {
  private mergeVacuum: MergeVacuumService;
  private activityTracker: ActivityTracker;
  private syncQueue: SyncQueue;
  private isInitialized = false;

  constructor() {
    this.activityTracker = new ActivityTracker();
    this.mergeVacuum = new MergeVacuumService();
    this.syncQueue = new SyncQueue();
    
    this.setupIntegration();
  }

  private setupIntegration(): void {
    // Connect activity tracker to merge-vacuum service
    this.activityTracker.subscribe((event) => {
      this.mergeVacuum.recordActivity();
    });

    // Connect sync queue to merge-vacuum for delta operations
    this.syncQueue.subscribe((operation) => {
      if (operation.type === 'delta') {
        this.mergeVacuum.addDeltaOperation(operation.data as DeltaOperation);
      }
    });

    this.isInitialized = true;
  }

  public recordWrite(operation: DeltaOperation): void {
    this.activityTracker.recordActivity('write', {
      noteId: operation.noteId,
      deltaCount: operation.deltas.length
    });
    
    this.syncQueue.enqueue({
      id: crypto.randomUUID(),
      type: 'delta',
      data: operation,
      timestamp: Date.now()
    });
  }

  public recordRead(noteId: string): void {
    this.activityTracker.recordActivity('read', { noteId });
  }

  public getMergeVacuumStats() {
    return this.mergeVacuum.getStats();
  }

  public subscribeMergeVacuum(listener: (stats: any) => void) {
    return this.mergeVacuum.subscribe(listener);
  }

  public getIdleTime(): number {
    return this.activityTracker.getIdleTime();
  }

  public destroy(): void {
    this.mergeVacuum.destroy();
  }
}

// Singleton instance
export const syncManager = new SyncManager();
