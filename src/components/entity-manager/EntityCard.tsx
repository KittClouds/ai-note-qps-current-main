
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotes } from '@/contexts/NotesContext';
import { Entity } from '@/utils/parsingUtils';
import { SchemaEntityAttributes } from './SchemaEntityAttributes';
import { ENTITY_SCHEMAS } from '@/types/attributes';

interface EntityCardProps {
  entity: Entity;
  viewMode?: 'note' | 'cluster';
  sourceNoteIds?: string[];
}

export function EntityCard({ entity, viewMode = 'note', sourceNoteIds = [] }: EntityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const { getEntityAttributes, setEntityAttributes } = useNotes();

  const entityKey = `${entity.kind}:${entity.label}`;
  const entitySchema = ENTITY_SCHEMAS.find(schema => schema.kind === entity.kind);
  const isClusterEntity = sourceNoteIds.length > 0;

  useEffect(() => {
    if (isExpanded) {
      const savedAttributes = getEntityAttributes(entityKey);
      
      // Initialize with schema defaults
      let initialAttributes: Record<string, any> = {};
      
      if (entitySchema) {
        entitySchema.attributes.forEach(schemaAttr => {
          initialAttributes[schemaAttr.name] = schemaAttr.defaultValue;
        });
      }
      
      // Merge with entity attributes from parsing
      if (entity.attributes && typeof entity.attributes === 'object') {
        initialAttributes = { ...initialAttributes, ...entity.attributes };
      }
      
      // Merge with saved attributes (highest priority)
      const mergedAttributes = { ...initialAttributes, ...savedAttributes };
      
      setAttributes(mergedAttributes);
    }
  }, [entityKey, entity.attributes, isExpanded, getEntityAttributes, entitySchema]);

  const handleAttributesChange = (updatedAttributes: Record<string, any>) => {
    setAttributes(updatedAttributes);
    setEntityAttributes(entityKey, updatedAttributes);
  };

  return (
    <Card className="bg-[#1a1b23] border-[#22242f]">
      <CardContent className="p-0">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-[#22242f] rounded-none text-left"
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium text-white">{entity.label}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {entity.kind.toLowerCase()}
            </Badge>
            {isClusterEntity && (
              <Badge variant="outline" className="text-xs">
                {sourceNoteIds.length} refs
              </Badge>
            )}
            {entitySchema && (
              <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                {entitySchema.attributes.length} schema
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0 space-y-3">
                {/* Source Notes (for cluster view) */}
                {viewMode === 'cluster' && isClusterEntity && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">
                      Found in notes:
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {sourceNoteIds.map((noteId, index) => (
                        <Badge
                          key={noteId}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-[#2a2d3a]"
                        >
                          <ExternalLink className="h-2 w-2 mr-1" />
                          Note {index + 1}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schema-based Attributes */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Attributes:
                  </h4>
                  
                  <SchemaEntityAttributes
                    attributes={attributes}
                    onAttributesChange={handleAttributesChange}
                    entityKind={entity.kind}
                    entityLabel={entity.label}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
