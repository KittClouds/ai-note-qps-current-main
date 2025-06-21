
import React from 'react';
import { EntityReference } from '@/types/attributes';
import { Badge } from '@/components/ui/badge';

interface EntityLinkRendererProps {
  value: EntityReference;
  onClick?: () => void;
}

export function EntityLinkRenderer({ value, onClick }: EntityLinkRendererProps) {
  return (
    <div 
      className="flex items-center gap-2 cursor-pointer hover:bg-[#1a1b23] p-2 rounded"
      onClick={onClick}
    >
      <span className="text-sm text-white">{value.label}</span>
      <Badge variant="outline" className="text-xs">
        {value.kind}
      </Badge>
    </div>
  );
}
