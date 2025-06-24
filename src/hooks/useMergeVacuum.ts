
import { useState, useEffect } from 'react';
import { syncManager } from '@/lib/sync/SyncManager';
import { MergeVacuumStats } from '@/lib/sync/MergeVacuumService';

export function useMergeVacuum() {
  const [stats, setStats] = useState<MergeVacuumStats>(() => syncManager.getMergeVacuumStats());

  useEffect(() => {
    const unsubscribe = syncManager.subscribeMergeVacuum(setStats);
    return unsubscribe;
  }, []);

  return {
    stats,
    isRunning: stats.isRunning,
    idleTime: stats.idleTime,
    deltaLogSize: stats.deltaLogSize,
    totalMerges: stats.totalMerges,
    lastError: stats.lastError
  };
}
