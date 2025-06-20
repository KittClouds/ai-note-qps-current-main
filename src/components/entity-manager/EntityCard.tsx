
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useNotes } from '@/contexts/NotesContext';
import { Entity } from '@/utils/parsingUtils';
import { EnhancedEntityAttributes } from './EnhancedEntityAttributes';

interface EntityCardProps {
  entity: Entity;
}

export function EntityCard({ entity }: EntityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const { getEntityAttributes, setEntityAttributes } = useNotes();

  const entityKey = `${entity.kind}:${entity.label}`;

  useEffect(() => {
    if (isExpanded) {
      const savedAttributes = getEntityAttributes(entityKey);
      // Merge with existing attributes from the entity
      const mergedAttributes = {
        ...entity.attributes,
        ...savedAttributes
      };
      setAttributes(mergedAttributes);
    }
  }, [entityKey, entity.attributes, isExpanded, getEntityAttributes]);

  const handleAttributesChange = (updatedAttributes: Record<string, any>) => {
    setAttributes(updatedAttributes);
    setEntityAttributes(entityKey, updatedAttributes);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-accent rounded-none text-left"
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium">{entity.label}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {entity.kind.toLowerCase()}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>

        {isExpanded && (
          <div className="p-3 pt-0 space-y-3">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Enhanced Attributes:
              </h4>
              
              <EnhancedEntityAttributes
                attributes={attributes}
                onAttributesChange={handleAttributesChange}
                entityKind={entity.kind}
                entityLabel={entity.label}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
