
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Zap, Database, Network } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { graphRAGSearchService, SearchResult } from '@/lib/embeddings/GraphRAGSearchService';
import { Note } from '@/types/notes';
import { toast } from '@/hooks/use-toast';

interface EnhancedSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notes: Note[];
  onNoteSelect: (id: string) => void;
  className?: string;
}

export const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  notes,
  onNoteSelect,
  className = ''
}) => {
  const [searchMode, setSearchMode] = useState<'text' | 'semantic' | 'graph'>('text');
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [indexStatus, setIndexStatus] = useState({
    hasIndex: false,
    indexSize: 0,
    needsRebuild: false,
    graphNodes: 0,
    graphEdges: 0
  });

  // Update index status on mount
  useEffect(() => {
    const status = graphRAGSearchService.getIndexStatus();
    setIndexStatus(status);
  }, []);

  const handleSemanticSearch = useDebouncedCallback(async (query: string) => {
    if (!query.trim() || searchMode === 'text') {
      setSemanticResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await graphRAGSearchService.search(query, 10);
      setSemanticResults(results);
    } catch (error) {
      console.error('Semantic search failed:', error);
      toast({
        title: "Search failed",
        description: "Could not perform semantic search. Try syncing embeddings first.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, 500);

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    if (searchMode === 'semantic' || searchMode === 'graph') {
      handleSemanticSearch(value);
    }
  };

  const handleModeChange = (mode: 'text' | 'semantic' | 'graph') => {
    setSearchMode(mode);
    if ((mode === 'semantic' || mode === 'graph') && searchQuery.trim()) {
      handleSemanticSearch(searchQuery);
    } else {
      setSemanticResults([]);
    }
  };

  const handleSyncEmbeddings = async () => {
    setIsSyncing(true);
    try {
      const count = await graphRAGSearchService.syncAllNotes(notes);
      const newStatus = graphRAGSearchService.getIndexStatus();
      setIndexStatus(newStatus);
      toast({
        title: "Embeddings synced",
        description: `Successfully synced ${count} note embeddings with ${newStatus.graphNodes} graph nodes and ${newStatus.graphEdges} edges`,
      });
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync failed",
        description: "Could not sync embeddings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getSearchPlaceholder = () => {
    switch (searchMode) {
      case 'text': return "Search notes... (Ctrl+K)";
      case 'semantic': return "Semantic search...";
      case 'graph': return "Graph-enhanced search...";
      default: return "Search notes...";
    }
  };

  return (
    <div className={className}>
      <Tabs value={searchMode} onValueChange={handleModeChange} className="w-full mb-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text" className="text-xs">Text</TabsTrigger>
          <TabsTrigger value="semantic" className="text-xs">Semantic</TabsTrigger>
          <TabsTrigger value="graph" className="text-xs">Graph</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          id="search-input"
          placeholder={getSearchPlaceholder()}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 bg-background/50 border-input/50 focus:bg-background focus:border-primary/50 transition-all"
        />
        {isSearching && (
          <Loader2 size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {(searchMode === 'semantic' || searchMode === 'graph') && (
        <div className="space-y-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleSyncEmbeddings}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Sync Embeddings
          </Button>
          
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-center">
              <Database className="h-3 w-3 mr-1" />
              <span>{indexStatus.indexSize} embeddings</span>
            </div>
            <div className="flex items-center justify-center">
              <Network className="h-3 w-3 mr-1" />
              <span>{indexStatus.graphNodes} nodes</span>
            </div>
          </div>
          
          {searchMode === 'graph' && indexStatus.graphEdges > 0 && (
            <div className="text-center text-xs text-muted-foreground">
              <span>{indexStatus.graphEdges} graph connections</span>
            </div>
          )}
        </div>
      )}

      {(searchMode === 'semantic' || searchMode === 'graph') && searchQuery && semanticResults.length > 0 && (
        <div className="space-y-1 mb-3">
          {semanticResults.map((result) => (
            <div
              key={result.noteId}
              className="p-2 rounded-md border border-transparent hover:border-primary/20 hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => onNoteSelect(result.noteId)}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium text-sm truncate">{result.title}</div>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(result.score * 100)}%
                  </Badge>
                  {result.graphScore && searchMode === 'graph' && (
                    <Badge variant="outline" className="text-xs">
                      G: {Math.round(result.graphScore * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {result.content.slice(0, 80)}...
              </p>
            </div>
          ))}
        </div>
      )}

      {(searchMode === 'semantic' || searchMode === 'graph') && searchQuery && semanticResults.length === 0 && !isSearching && (
        <div className="text-center text-muted-foreground py-4 mb-3">
          <p className="text-sm">No results found</p>
          <p className="text-xs">Try syncing embeddings first</p>
        </div>
      )}
    </div>
  );
};
