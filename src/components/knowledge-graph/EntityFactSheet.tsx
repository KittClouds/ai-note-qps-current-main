
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Database } from 'lucide-react';
import { EntityFactSheet, KnowledgeEntity } from '@/lib/knowledge-graph/types';

interface EntityFactSheetProps {
  factSheet: EntityFactSheet;
  onBackClick: () => void;
  onEntityClick: (entity: KnowledgeEntity) => void;
}

export const EntityFactSheetComponent: React.FC<EntityFactSheetProps> = ({
  factSheet,
  onBackClick,
  onEntityClick
}) => {
  const { entity, factsAbout, factsRelated } = factSheet;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackClick}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h3 className="text-sm font-medium">Fact Sheet: {entity.value}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-1 bg-muted rounded font-mono">
              {entity.type}
            </span>
            {entity.confidence && (
              <span className="text-xs text-muted-foreground">
                {(entity.confidence * 100).toFixed(1)}% confidence
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Facts About Entity */}
      {factsAbout.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-700 dark:text-green-400">
            Facts About {entity.value}
          </h4>
          <div className="space-y-2 ml-2">
            {factsAbout.map((triple, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30">
                <span className="text-sm text-muted-foreground">
                  {triple.predicate}
                </span>
                <span className="text-sm text-muted-foreground">→</span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm font-medium text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                  onClick={() => onEntityClick(triple.object)}
                >
                  {triple.object.value}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
                {triple.confidence && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(triple.confidence * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facts Related to Entity */}
      {factsRelated.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400">
            Facts Related to {entity.value}
          </h4>
          <div className="space-y-2 ml-2">
            {factsRelated.map((triple, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30">
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  onClick={() => onEntityClick(triple.subject)}
                >
                  {triple.subject.value}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {triple.predicate}
                </span>
                <span className="text-sm text-muted-foreground">→</span>
                <span className="text-sm font-medium">{entity.value}</span>
                {triple.confidence && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(triple.confidence * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Facts Available */}
      {factsAbout.length === 0 && factsRelated.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No relationships found for this entity</p>
          <p className="text-xs">This entity was identified but has no connections to other entities</p>
        </div>
      )}
    </div>
  );
};
