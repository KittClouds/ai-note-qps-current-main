
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MergeVacuumStats } from '@/lib/sync/MergeVacuumService';
import { formatDistanceToNow } from 'date-fns';

interface SystemStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mergeVacuumStats: MergeVacuumStats;
}

export function SystemStatusModal({ open, onOpenChange, mergeVacuumStats }: SystemStatusModalProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (reason: string) => {
    switch (reason) {
      case 'size': return 'destructive';
      case 'idle': return 'secondary';
      default: return 'default';
    }
  };

  const logSizePercent = Math.min((mergeVacuumStats.logSize / (5 * 1024 * 1024)) * 100, 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>System Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Merge-Vacuum Service</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={mergeVacuumStats.isRunning ? "secondary" : "default"}>
                  {mergeVacuumStats.isRunning ? 'Running' : 'Idle'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Merge Count</span>
                <span className="text-sm font-medium">{mergeVacuumStats.mergeCount}</span>
              </div>
              
              {mergeVacuumStats.lastMerge && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Merge</span>
                  <span className="text-sm font-medium">
                    {formatDistanceToNow(new Date(mergeVacuumStats.lastMerge), { addSuffix: true })}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next Merge</span>
                <Badge variant={getStatusColor(mergeVacuumStats.nextMergeReason)}>
                  {mergeVacuumStats.nextMergeReason === 'none' ? 'Not scheduled' : mergeVacuumStats.nextMergeReason}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Log Size</span>
              <span className="text-sm font-medium">{formatBytes(mergeVacuumStats.logSize)}</span>
            </div>
            <Progress value={logSizePercent} className="w-full" />
            <div className="text-xs text-muted-foreground mt-1">
              {logSizePercent.toFixed(1)}% of 5MB threshold
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
