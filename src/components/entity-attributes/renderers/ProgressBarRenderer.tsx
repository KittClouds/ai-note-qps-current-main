
import React from 'react';
import { ProgressBarValue } from '@/types/attributes';

interface ProgressBarRendererProps {
  value: ProgressBarValue;
  label: string;
}

export function ProgressBarRenderer({ value, label }: ProgressBarRendererProps) {
  const percentage = Math.round((value.current / value.maximum) * 100);
  
  const getBarColor = (percent: number) => {
    if (percent > 66) return 'bg-green-500';
    if (percent > 33) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-sm text-muted-foreground">
          {value.current}/{value.maximum}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-center">
        {percentage}%
      </div>
    </div>
  );
}
