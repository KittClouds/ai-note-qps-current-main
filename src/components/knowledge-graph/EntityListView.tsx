
import React from 'react';
import { Button } from '@/components/ui/button';
import { Database, Users, MapPin, Building, Calendar, Hash } from 'lucide-react';
import { KnowledgeEntity } from '@/lib/knowledge-graph/types';

interface EntityListViewProps {
  entities: KnowledgeEntity[];
  onEntityClick: (entity: KnowledgeEntity) => void;
  provider: string;
}

const getEntityIcon = (type: string) => {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes('person')) return Users;
  if (normalizedType.includes('org')) return Building;
  if (normalizedType.includes('loc') || normalizedType.includes('gpe')) return MapPin;
  if (normalizedType.includes('date') || normalizedType.includes('time')) return Calendar;
  return Hash;
};

const getEntityColor = (type: string) => {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes('person')) return 'text-blue-600 dark:text-blue-400';
  if (normalizedType.includes('org')) return 'text-green-600 dark:text-green-400';
  if (normalizedType.includes('loc') || normalizedType.includes('gpe')) return 'text-purple-600 dark:text-purple-400';
  if (normalizedType.includes('date') || normalizedType.includes('time')) return 'text-orange-600 dark:text-orange-400';
  return 'text-gray-600 dark:text-gray-400';
};

export const EntityListView: React.FC<EntityListViewProps> = ({ entities, onEntityClick, provider }) => {
  // Group entities by type
  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<string, KnowledgeEntity[]>);

  const sortedTypes = Object.keys(groupedEntities).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Knowledge Graph Entities</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-muted rounded">
            {provider}
          </span>
          <span className="text-xs text-muted-foreground">
            {entities.length} entities
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {sortedTypes.map((type) => {
          const typeEntities = groupedEntities[type];
          const Icon = getEntityIcon(type);
          const colorClass = getEntityColor(type);
          
          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${colorClass}`} />
                <span className="text-sm font-medium">{type}</span>
                <span className="text-xs text-muted-foreground">
                  ({typeEntities.length})
                </span>
              </div>
              
              <div className="ml-6 space-y-1">
                {typeEntities.map((entity) => (
                  <Button
                    key={entity.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2 hover:bg-muted/50"
                    onClick={() => onEntityClick(entity)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-medium">{entity.value}</span>
                      {entity.confidence && (
                        <span className="text-xs text-muted-foreground">
                          {(entity.confidence * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
