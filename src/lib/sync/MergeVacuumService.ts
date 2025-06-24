
import { DeltaOperation } from './DeltaCompression';

export interface MergeVacuumConfig {
  idleThresholdMs: number; // 10 seconds default
  logSizeThresholdBytes: number; // 5MB default
  maxRetries: number;
  retryBackoffMs: number;
}

export interface MergeVacuumStats {
  lastMergeTime: number;
  totalMerges: number;
  deltaLogSize: number;
  idleTime: number;
  isRunning: boolean;
  lastError?: string;
}

export class MergeVacuumService {
  private config: MergeVacuumConfig;
  private stats: MergeVacuumStats;
  private activityTimer: number | null = null;
  private sizeCheckTimer: number | null = null;
  private lastActivity: number = Date.now();
  private isProcessing = false;
  private deltaLog: DeltaOperation[] = [];
  private listeners: Array<(stats: MergeVacuumStats) => void> = [];
  private worker: Worker | null = null;

  constructor(config: Partial<MergeVacuumConfig> = {}) {
    this.config = {
      idleThresholdMs: 10000, // 10 seconds
      logSizeThresholdBytes: 5 * 1024 * 1024, // 5MB
      maxRetries: 3,
      retryBackoffMs: 1000,
      ...config
    };

    this.stats = {
      lastMergeTime: 0,
      totalMerges: 0,
      deltaLogSize: 0,
      idleTime: 0,
      isRunning: false
    };

    this.initializeWorker();
    this.startMonitoring();
  }

  private initializeWorker(): void {
    // Create a Web Worker for background processing
    const workerCode = `
      self.onmessage = function(e) {
        const { type, data } = e.data;
        
        if (type === 'MERGE_COMPACT') {
          try {
            // Simulate merge-compact operation
            // In real implementation, this would:
            // 1. Read current SQLite state
            // 2. Apply all delta operations
            // 3. Write consolidated state back
            // 4. Verify integrity
            
            const { deltas } = data;
            console.log('MergeVacuum: Processing', deltas.length, 'delta operations');
            
            // Simulate processing time
            const processingTime = Math.min(deltas.length * 10, 1000);
            setTimeout(() => {
              self.postMessage({
                type: 'MERGE_COMPLETE',
                data: {
                  success: true,
                  processedCount: deltas.length,
                  compactedSize: deltas.reduce((size, delta) => size + JSON.stringify(delta).length, 0)
                }
              });
            }, processingTime);
            
          } catch (error) {
            self.postMessage({
              type: 'MERGE_ERROR',
              data: { error: error.message }
            });
          }
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.onmessage = (e) => {
      const { type, data } = e.data;
      
      if (type === 'MERGE_COMPLETE') {
        this.handleMergeComplete(data);
      } else if (type === 'MERGE_ERROR') {
        this.handleMergeError(data.error);
      }
    };
  }

  private startMonitoring(): void {
    // Monitor for idle conditions
    this.activityTimer = window.setInterval(() => {
      const now = Date.now();
      this.stats.idleTime = now - this.lastActivity;
      
      if (this.shouldTriggerMerge()) {
        this.triggerMergeVacuum('idle_threshold');
      }
      
      this.notifyListeners();
    }, 1000);

    // Monitor delta log size
    this.sizeCheckTimer = window.setInterval(() => {
      this.updateDeltaLogSize();
      
      if (this.shouldTriggerMerge()) {
        this.triggerMergeVacuum('size_threshold');
      }
    }, 5000);
  }

  public recordActivity(): void {
    this.lastActivity = Date.now();
    this.stats.idleTime = 0;
  }

  public addDeltaOperation(operation: DeltaOperation): void {
    this.deltaLog.push(operation);
    this.recordActivity();
    this.updateDeltaLogSize();
  }

  private updateDeltaLogSize(): void {
    this.stats.deltaLogSize = this.deltaLog.reduce(
      (size, op) => size + JSON.stringify(op).length, 
      0
    );
  }

  private shouldTriggerMerge(): boolean {
    if (this.isProcessing) return false;
    
    const idleCondition = this.stats.idleTime >= this.config.idleThresholdMs;
    const sizeCondition = this.stats.deltaLogSize >= this.config.logSizeThresholdBytes;
    
    return (idleCondition || sizeCondition) && this.deltaLog.length > 0;
  }

  private async triggerMergeVacuum(reason: string): Promise<void> {
    if (this.isProcessing || !this.worker) return;

    console.log(`MergeVacuum: Triggering merge due to ${reason}`);
    
    this.isProcessing = true;
    this.stats.isRunning = true;
    this.notifyListeners();

    try {
      // Send delta operations to worker for processing
      this.worker.postMessage({
        type: 'MERGE_COMPACT',
        data: {
          deltas: [...this.deltaLog],
          reason
        }
      });
    } catch (error) {
      this.handleMergeError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private handleMergeComplete(data: { success: boolean; processedCount: number; compactedSize: number }): void {
    console.log(`MergeVacuum: Merge completed - processed ${data.processedCount} operations, compacted ${data.compactedSize} bytes`);
    
    // Reset delta log after successful merge
    this.deltaLog = [];
    this.stats.deltaLogSize = 0;
    this.stats.totalMerges++;
    this.stats.lastMergeTime = Date.now();
    this.stats.lastError = undefined;
    
    this.isProcessing = false;
    this.stats.isRunning = false;
    this.notifyListeners();
  }

  private handleMergeError(error: string): void {
    console.error('MergeVacuum: Merge failed:', error);
    
    this.stats.lastError = error;
    this.isProcessing = false;
    this.stats.isRunning = false;
    this.notifyListeners();
  }

  public getStats(): MergeVacuumStats {
    return { ...this.stats };
  }

  public subscribe(listener: (stats: MergeVacuumStats) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getStats()));
  }

  public destroy(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
    if (this.sizeCheckTimer) {
      clearInterval(this.sizeCheckTimer);
    }
    if (this.worker) {
      this.worker.terminate();
    }
  }
}
