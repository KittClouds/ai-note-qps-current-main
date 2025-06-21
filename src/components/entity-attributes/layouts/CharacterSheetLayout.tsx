
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface CharacterSheetLayoutProps {
  attributes: any[];
  onAttributeClick?: (attribute: any) => void;
}

export function CharacterSheetLayout({ attributes, onAttributeClick }: CharacterSheetLayoutProps) {
  // Group attributes by type for character sheet layout
  const basicInfo = attributes.filter(attr => !['StatBlock', 'ProgressBar'].includes(attr.type));

  const renderBasicAttribute = (attr: any) => {
    const formatValue = () => {
      switch (attr.type) {
        case 'Boolean':
          return attr.value ? 'Yes' : 'No';
        case 'Date':
          return new Date(attr.value as string).toLocaleDateString();
        case 'List':
          return Array.isArray(attr.value) ? attr.value.join(', ') : 'Invalid list';
        default:
          return String(attr.value);
      }
    };

    return (
      <div key={attr.id} className="flex justify-between items-center py-2 border-b border-[#1a1b23] last:border-b-0">
        <span className="text-sm text-muted-foreground">{attr.name}</span>
        <span className="text-sm font-medium text-white">{formatValue()}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Basic Info Section */}
      {basicInfo.length > 0 && (
        <div className="bg-[#12141f] border border-[#1a1b23] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-400 text-xs">Details</Badge>
          </h3>
          <div className="space-y-1">
            {basicInfo.map(renderBasicAttribute)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {attributes.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>No character attributes found.</p>
          <p className="text-sm mt-1">Add stat blocks and progress bars in the Entity Manager.</p>
        </div>
      )}
    </div>
  );
}
