
import React from 'react';
import { RelationshipValue } from '@/types/attributes';
import { Badge } from '@/components/ui/badge';

interface RelationshipRendererProps {
  value: RelationshipValue;
  onClick?: () => void;
}

export function RelationshipRenderer({ value, onClick }: RelationshipRendererProps) {
  return (
    <div 
      className="flex items-center gap-2 cursor-pointer hover:bg-[#1a1b23] p-2 rounded"
      onClick={onClick}
    >
      <span className="text-sm text-white">{value.entityLabel}</span>
      <Badge variant="outline" className="text-xs">
        {value.relationshipType}
      </Badge>
    </div>
  );
}
