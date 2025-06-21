
import React from 'react';
import { TypedAttribute, RelationshipValue, ProgressBarValue } from '@/types/attributes';
import { RelationshipRenderer } from '../renderers/RelationshipRenderer';
import { ProgressBarRenderer } from '../renderers/ProgressBarRenderer';
import { Badge } from '@/components/ui/badge';

interface FactionOverviewLayoutProps {
  attributes: TypedAttribute[];
  onAttributeClick?: (attribute: TypedAttribute) => void;
}

export function FactionOverviewLayout({ attributes, onAttributeClick }: FactionOverviewLayoutProps) {
  // Group attributes for faction display
  const relationships = attributes.filter(attr => attr.type === 'Relationship');
  const progressBars = attributes.filter(attr => attr.type === 'ProgressBar');
  const textAttributes = attributes.filter(attr => ['Text', 'Number', 'Boolean'].includes(attr.type));
  const lists = attributes.filter(attr => attr.type === 'List');

  const renderTextAttribute = (attr: TypedAttribute) => {
    const formatValue = () => {
      switch (attr.type) {
        case 'Boolean':
          return attr.value ? 'Active' : 'Inactive';
        case 'Number':
          return `${attr.value}${attr.unit ? ` ${attr.unit}` : ''}`;
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

  const renderListAttribute = (attr: TypedAttribute) => {
    const list = attr.value as string[];
    return (
      <div key={attr.id} className="mb-3">
        <div className="text-sm font-medium text-white mb-2">{attr.name}</div>
        <div className="space-y-1">
          {Array.isArray(list) && list.length > 0 ? (
            list.map((item, index) => (
              <div key={index} className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                {item}
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">No items</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Relationships Section */}
      {relationships.length > 0 && (
        <div className="bg-[#12141f] border border-[#1a1b23] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Badge className="bg-rose-500/20 text-rose-400 text-xs">Relationships</Badge>
          </h3>
          <div className="space-y-2">
            {relationships.map(attr => (
              <div key={attr.id}>
                <div className="text-xs text-muted-foreground mb-1">{attr.name}</div>
                <RelationshipRenderer 
                  value={attr.value as RelationshipValue}
                  onClick={() => onAttributeClick?.(attr)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Power & Influence Section */}
      {progressBars.length > 0 && (
        <div className="bg-[#12141f] border border-[#1a1b23] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Power & Influence</Badge>
          </h3>
          <div className="space-y-4">
            {progressBars.map(attr => (
              <ProgressBarRenderer 
                key={attr.id}
                value={attr.value as ProgressBarValue} 
                label={attr.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Basic Information Section */}
      {textAttributes.length > 0 && (
        <div className="bg-[#12141f] border border-[#1a1b23] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-400 text-xs">Information</Badge>
          </h3>
          <div className="space-y-1">
            {textAttributes.map(renderTextAttribute)}
          </div>
        </div>
      )}

      {/* Lists Section */}
      {lists.length > 0 && (
        <div className="bg-[#12141f] border border-[#1a1b23] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Collections</Badge>
          </h3>
          <div className="space-y-3">
            {lists.map(renderListAttribute)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {attributes.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>No faction attributes found.</p>
          <p className="text-sm mt-1">Add relationships and influence metrics in the Entity Manager.</p>
        </div>
      )}
    </div>
  );
}
