
import { ActivityTracker } from './ActivityTracker';

export interface MergeVacuumConfig {
  maxLogSize: number; // 5MB default
  idleThreshold: number; // 10 seconds default
  enabled: boolean;
}

export interface MergeVacuumStats {
  lastMerge: number | null;
  mergeCount: number;
  logSize: number;
  isRunning: boolean;
  nextMergeReason: 'idle' | 'size' | 'none';
}

export class MergeVacuumService {
  private config: MergeVacuumConfig;
  private activityTracker: ActivityTracker;
  private stats: MergeVacuumStats;
  private checkInterval: number | null = null;
  private isRunning = false;
  private listeners: Array<(stats: MergeVacuumStats) => void> = [];

  constructor(config: Partial<MergeVacuumConfig> = {}) {
    this.config = {
      maxLogSize: 5 * 1024 * 1024, // 5MB
      idleThreshold: 10000, // 10 seconds
      enabled: true,
      ...config
    };

    this.activityTracker = new ActivityTracker(this.config.idleThreshold);
    this.stats = {
      lastMerge: null,
      mergeCount: 0,
      logSize: 0,
      isRunning: false,
      nextMergeReason: 'none'
    };

    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  recordActivity(): void {
    this.activityTracker.recordActivity();
  }

  updateLogSize(size: number): void {
    this.stats.logSize = size;
    this.checkMergeConditions();
  }

  private startMonitoring(): void {
    // Check merge conditions every 5 seconds
    this.checkInterval = window.setInterval(() => {
      this.checkMergeConditions();
    }, 5000);

    // Subscribe to activity changes
    this.activityTracker.subscribe(() => {
      this.checkMergeConditions();
    });
  }

  private checkMergeConditions(): void {
    if (this.isRunning) return;

    const shouldMergeIdle = this.activityTracker.isCurrentlyIdle();
    const shouldMergeSize = this.stats.logSize >= this.config.maxLogSize;

    if (shouldMergeSize) {
      this.stats.nextMergeReason = 'size';
      this.triggerMerge('Log size exceeded threshold');
    } else if (shouldMergeIdle) {
      this.stats.nextMergeReason = 'idle';
      this.triggerMerge('System idle for sufficient time');
    } else {
      this.stats.nextMergeReason = 'none';
    }

    this.notifyListeners();
  }

  private async triggerMerge(reason: string): Promise<void> {
    if (this.isRunning) return;

    console.log(`MergeVacuum: Starting merge operation - ${reason}`);
    this.isRunning = true;
    this.stats.isRunning = true;
    this.notifyListeners();

    try {
      // Simulate merge-compact operation
      // In a real implementation, this would:
      // 1. Read all delta entries from the log
      // 2. Apply them to the base storage
      // 3. Clear the delta log
      // 4. Update internal indexes
      
      await this.performMergeCompact();
      
      this.stats.lastMerge = Date.now();
      this.stats.mergeCount++;
      this.stats.logSize = 0; // Reset after successful merge
      this.stats.nextMergeReason = 'none';
      
      console.log(`MergeVacuum: Merge completed successfully (#${this.stats.mergeCount})`);
    } catch (error) {
      console.error('MergeVacuum: Merge operation failed:', error);
    } finally {
      this.isRunning = false;
      this.stats.isRunning = false;
      this.notifyListeners();
    }
  }

  private async performMergeCompact(): Promise<void> {
    // Simulate async merge operation
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock merge-compact logic here
        // This would integrate with the actual LiveStore persistence layer
        resolve();
      }, 1000 + Math.random() * 2000); // 1-3 seconds
    });
  }

  getStats(): MergeVacuumStats {
    return { ...this.stats };
  }

  subscribe(listener: (stats: MergeVacuumStats) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.activityTracker.destroy();
  }
}
