
import React, { useState, useMemo } from 'react';
import { useNotes } from '@/contexts/NotesContext';
import { parseNoteConnections } from '@/utils/parsingUtils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { EntityTypeGroup } from './EntityTypeGroup';

export function EntityManagerContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedNote } = useNotes();

  // Parse entities from the current note
  const entities = useMemo(() => {
    if (!selectedNote) return [];
    
    try {
      const contentObj = typeof selectedNote.content === 'string' 
        ? JSON.parse(selectedNote.content) 
        : selectedNote.content;
      const connections = parseNoteConnections(contentObj);
      return connections.entities || [];
    } catch (error) {
      console.error('Failed to parse note content for entities:', error);
      return [];
    }
  }, [selectedNote]);

  // Group entities by kind and filter by search
  const entityGroups = useMemo(() => {
    const filtered = searchQuery 
      ? entities.filter(entity => 
          entity.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entity.kind.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : entities;

    const groups: Record<string, typeof entities> = {};
    filtered.forEach(entity => {
      if (!groups[entity.kind]) {
        groups[entity.kind] = [];
      }
      groups[entity.kind].push(entity);
    });

    return groups;
  }, [entities, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with current note info */}
      <div className="p-4 border-b">
        <div className="mb-4 p-2 bg-muted rounded-md">
          <div className="text-sm font-medium">Current Note</div>
          <div className="text-xs text-muted-foreground">
            {selectedNote ? selectedNote.title : 'No note selected'}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search entities..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Entity Groups */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {!selectedNote ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a note to view its entities.</p>
          </div>
        ) : Object.keys(entityGroups).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No entities found in this note.</p>
            <p className="mt-2 text-sm">
              Use <code className="bg-muted px-1 rounded">[TYPE|Label]</code> syntax to create entities.
            </p>
          </div>
        ) : (
          Object.entries(entityGroups).map(([kind, entityList]) => (
            <EntityTypeGroup
              key={kind}
              kind={kind}
              entities={entityList}
            />
          ))
        )}
      </div>
    </div>
  );
}
