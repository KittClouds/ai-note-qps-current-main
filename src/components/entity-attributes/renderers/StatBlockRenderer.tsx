
import React from 'react';
import { StatBlockValue } from '@/types/attributes';

interface StatBlockRendererProps {
  value: StatBlockValue;
}

export function StatBlockRenderer({ value }: StatBlockRendererProps) {
  const stats = Object.entries(value);
  const highestStat = Math.max(...Object.values(value));

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(([stat, val]) => (
        <div key={stat} className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground capitalize">
            {stat.slice(0, 3)}
          </span>
          <span className={`text-sm font-medium ${
            val === highestStat ? 'font-bold text-primary' : 'text-white'
          }`}>
            {val}
          </span>
        </div>
      ))}
    </div>
  );
}
