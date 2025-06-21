
import React from 'react';
import { TypedAttribute, ProgressBarValue, StatBlockValue, RelationshipValue, EntityReference } from '@/types/attributes';
import { Badge } from '@/components/ui/badge';
import { ProgressBarRenderer } from '../renderers/ProgressBarRenderer';
import { StatBlockRenderer } from '../renderers/StatBlockRenderer';
import { RelationshipRenderer } from '../renderers/RelationshipRenderer';
import { EntityLinkRenderer } from '../renderers/EntityLinkRenderer';

interface SimpleLayoutProps {
  attributes: TypedAttribute[];
  onAttributeClick?: (attribute: TypedAttribute) => void;
}

export function SimpleLayout({ attributes, onAttributeClick }: SimpleLayoutProps) {
  const formatValue = (attribute: TypedAttribute): string => {
    if (attribute.value === null || attribute.value === undefined) return 'N/A';
    
    switch (attribute.type) {
      case 'Boolean':
        return attribute.value ? 'True' : 'False';
      case 'Date':
        return new Date(attribute.value as string).toLocaleDateString();
      case 'List':
        const list = attribute.value as string[];
        return Array.isArray(list) ? `${list.length} items` : 'Invalid list';
      case 'URL':
        return attribute.value as string;
      default:
        if (typeof attribute.value === 'object') {
          return JSON.stringify(attribute.value);
        }
        return String(attribute.value);
    }
  };

  const renderAttributeValue = (attribute: TypedAttribute) => {
    switch (attribute.type) {
      case 'ProgressBar':
        return (
          <ProgressBarRenderer 
            value={attribute.value as ProgressBarValue} 
            label={attribute.name}
          />
        );
      
      case 'StatBlock':
        return (
          <StatBlockRenderer 
            value={attribute.value as StatBlockValue}
          />
        );
      
      case 'Relationship':
        return (
          <RelationshipRenderer 
            value={attribute.value as RelationshipValue}
            onClick={() => onAttributeClick?.(attribute)}
          />
        );
      
      case 'EntityLink':
        return (
          <EntityLinkRenderer 
            value={attribute.value as EntityReference}
            onClick={() => onAttributeClick?.(attribute)}
          />
        );
      
      case 'List':
        const list = attribute.value as string[];
        return (
          <div className="space-y-1">
            {Array.isArray(list) && list.length > 0 ? (
              list.slice(0, 3).map((item, index) => (
                <div key={index} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {item}
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">No items</div>
            )}
            {Array.isArray(list) && list.length > 3 && (
              <div className="text-xs text-muted-foreground">+{list.length - 3} more</div>
            )}
          </div>
        );
      
      case 'Boolean':
        return (
          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            attribute.value ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {attribute.value ? 'True' : 'False'}
          </div>
        );
      
      case 'Number':
        return (
          <div className="text-sm font-medium text-white">
            {String(attribute.value)}
            {attribute.unit && <span className="text-muted-foreground ml-1">{attribute.unit}</span>}
          </div>
        );
      
      case 'URL':
        return (
          <a 
            href={attribute.value as string} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm underline"
          >
            {attribute.value as string}
          </a>
        );
      
      case 'Date':
        return (
          <div className="text-sm text-muted-foreground">
            {new Date(attribute.value as string).toLocaleDateString()}
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-muted-foreground max-w-[200px] break-words">
            {formatValue(attribute)}
          </div>
        );
    }
  };

  const getTypeColor = (type: string): string => {
    const colors = {
      Text: 'bg-blue-500/20 text-blue-400',
      Number: 'bg-green-500/20 text-green-400',
      Boolean: 'bg-purple-500/20 text-purple-400',
      Date: 'bg-orange-500/20 text-orange-400',
      List: 'bg-yellow-500/20 text-yellow-400',
      EntityLink: 'bg-pink-500/20 text-pink-400',
      URL: 'bg-cyan-500/20 text-cyan-400',
      ProgressBar: 'bg-emerald-500/20 text-emerald-400',
      StatBlock: 'bg-indigo-500/20 text-indigo-400',
      Relationship: 'bg-rose-500/20 text-rose-400'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="space-y-3">
      {attributes.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <p>No attributes found for this entity.</p>
          <p className="text-sm mt-1">Add attributes in the Entity Manager to see them here.</p>
        </div>
      ) : (
        attributes.map(attr => (
          <div key={attr.id} className="bg-[#12141f] border border-[#1a1b23] rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${getTypeColor(attr.type)}`}>
                  {attr.type}
                </Badge>
                <div className="text-sm font-medium text-white">{attr.name}</div>
              </div>
            </div>
            <div className="mt-2">
              {renderAttributeValue(attr)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
