
import { useEffect, useRef, useState } from 'react';
import { MergeVacuumService, MergeVacuumStats } from '@/lib/sync/MergeVacuumService';

export function useMergeVacuum() {
  const serviceRef = useRef<MergeVacuumService | null>(null);
  const [stats, setStats] = useState<MergeVacuumStats>({
    lastMerge: null,
    mergeCount: 0,
    logSize: 0,
    isRunning: false,
    nextMergeReason: 'none'
  });

  useEffect(() => {
    // Initialize the service
    serviceRef.current = new MergeVacuumService();
    
    // Subscribe to stats updates
    const unsubscribe = serviceRef.current.subscribe(setStats);

    return () => {
      unsubscribe();
      if (serviceRef.current) {
        serviceRef.current.destroy();
      }
    };
  }, []);

  const recordActivity = () => {
    if (serviceRef.current) {
      serviceRef.current.recordActivity();
    }
  };

  const updateLogSize = (size: number) => {
    if (serviceRef.current) {
      serviceRef.current.updateLogSize(size);
    }
  };

  return {
    stats,
    recordActivity,
    updateLogSize,
    service: serviceRef.current
  };
}
