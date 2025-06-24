
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useMergeVacuum } from '@/hooks/useMergeVacuum';

export function MergeVacuumStatus() {
  const { stats, isRunning, idleTime, deltaLogSize, totalMerges, lastError } = useMergeVacuum();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${Math.floor(ms / 1000)}s`;
  };

  const getStatusColor = (): string => {
    if (lastError) return 'destructive';
    if (isRunning) return 'default';
    if (deltaLogSize > 1024 * 1024) return 'secondary'; // > 1MB
    return 'outline';
  };

  const getStatusText = (): string => {
    if (lastError) return 'Error';
    if (isRunning) return 'Compacting...';
    if (deltaLogSize > 1024 * 1024) return 'Pending';
    return 'Ready';
  };

  // Don't show if no activity
  if (totalMerges === 0 && deltaLogSize === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Badge variant={getStatusColor()} className="text-xs">
        {getStatusText()}
      </Badge>
      
      <div className="flex items-center gap-1">
        <span>Δ-log:</span>
        <span className="font-mono">{formatBytes(deltaLogSize)}</span>
      </div>

      <div className="flex items-center gap-1">
        <span>Idle:</span>
        <span className="font-mono">{formatTime(idleTime)}</span>
      </div>

      {totalMerges > 0 && (
        <div className="flex items-center gap-1">
          <span>Merges:</span>
          <span className="font-mono">{totalMerges}</span>
        </div>
      )}

      {isRunning && (
        <Progress value={undefined} className="w-16 h-1" />
      )}
    </div>
  );
}
