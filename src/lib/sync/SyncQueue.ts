
import { DeltaOperation } from './DeltaCompression';

export interface SyncQueueItem {
  id: string;
  type: 'delta' | 'merge' | 'compact';
  data: DeltaOperation | any;
  priority: 'high' | 'normal' | 'low';
  retries: number;
  timestamp: number;
}

export class SyncQueue {
  private queue: SyncQueueItem[] = [];
  private processing = false;
  private listeners: Array<(item: SyncQueueItem) => void> = [];
  private statusListeners: Array<(state: { pending: number; processing: boolean }) => void> = [];

  enqueue(item: Omit<SyncQueueItem, 'priority' | 'retries'>): void {
    const queueItem: SyncQueueItem = {
      ...item,
      priority: 'normal',
      retries: 0
    };

    // Insert based on priority
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    let insertIndex = this.queue.findIndex(
      existing => priorityOrder[existing.priority] > priorityOrder[queueItem.priority]
    );
    
    if (insertIndex === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(insertIndex, 0, queueItem);
    }

    this.notifyStatusListeners();
    this.processQueue();
  }

  add(operation: DeltaOperation, priority: 'high' | 'normal' | 'low' = 'normal'): void {
    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      type: 'delta',
      data: operation,
      priority,
      retries: 0,
      timestamp: Date.now()
    };

    // Insert based on priority
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    let insertIndex = this.queue.findIndex(
      existing => priorityOrder[existing.priority] > priorityOrder[priority]
    );
    
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }

    this.notifyStatusListeners();
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    this.notifyStatusListeners();

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      
      try {
        await this.processSyncItem(item);
        this.notifyListeners(item);
      } catch (error) {
        console.error('Sync error:', error);
        
        if (item.retries < 3) {
          item.retries++;
          // Re-add to queue with lower priority
          const newPriority = item.priority === 'high' ? 'normal' : 'low';
          this.queue.push({ ...item, priority: newPriority });
        }
      }
    }

    this.processing = false;
    this.notifyStatusListeners();
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    // Simulate sync processing - replace with actual sync logic
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Synced operation:', item);
        resolve();
      }, 100);
    });
  }

  getStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.processing
    };
  }

  subscribe(listener: (item: SyncQueueItem) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  subscribeStatus(listener: (state: { pending: number; processing: boolean }) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(item: SyncQueueItem): void {
    this.listeners.forEach(listener => listener(item));
  }

  private notifyStatusListeners(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => listener(status));
  }

  clear(): void {
    this.queue = [];
    this.notifyStatusListeners();
  }
}
