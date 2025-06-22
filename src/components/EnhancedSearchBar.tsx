import React, { useState, useEffect } from 'react';
import { Search, Loader2, Zap, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { embeddingsService, SearchResult } from '@/lib/embeddings/embeddingsService';
import { Note } from '@/types/notes';
import { useToast } from '@/hooks/use-toast';
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
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text');
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
  const {
    toast
  } = useToast();

  // Update index status on mount
  useEffect(() => {
    const status = embeddingsService.getIndexStatus();
    setIndexStatus(status);
  }, []);
  const handleSemanticSearch = useDebouncedCallback(async (query: string) => {
    if (!query.trim() || searchMode === 'text') {
      setSemanticResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await embeddingsService.search(query, 10);
      setSemanticResults(results);
    } catch (error) {
      console.error('Semantic search failed:', error);
      toast({
        title: "Search failed",
        description: "Could not perform semantic search. Try syncing embeddings first.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  }, 500);
  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    if (searchMode === 'semantic') {
      handleSemanticSearch(value);
    }
  };
  const handleModeChange = (mode: 'text' | 'semantic') => {
    setSearchMode(mode);
    if (mode === 'semantic' && searchQuery.trim()) {
      handleSemanticSearch(searchQuery);
    } else {
      setSemanticResults([]);
    }
  };
  const handleSyncEmbeddings = async () => {
    setIsSyncing(true);
    try {
      const count = await embeddingsService.syncAllNotes(notes);
      const newStatus = embeddingsService.getIndexStatus();
      setIndexStatus(newStatus);
      toast({
        title: "Embeddings synced",
        description: `Successfully synced ${count} note embeddings with ${newStatus.graphNodes} graph nodes and ${newStatus.graphEdges} edges`
      });
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync failed",
        description: "Could not sync embeddings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };
  const getSearchPlaceholder = () => {
    switch (searchMode) {
      case 'text':
        return "Search notes... (Ctrl+K)";
      case 'semantic':
        return "Semantic search...";
      default:
        return "Search notes...";
    }
  };
  return <div className={className}>
      <Tabs value={searchMode} onValueChange={handleModeChange} className="w-full mb-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text" className="text-xs">Folders</TabsTrigger>
          <TabsTrigger value="semantic" className="text-xs">Semantic</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input id="search-input" placeholder={getSearchPlaceholder()} value={searchQuery} onChange={e => handleSearchChange(e.target.value)} className="pl-9 bg-background/50 border-input/50 focus:bg-background focus:border-primary/50 transition-all" />
        {isSearching && <Loader2 size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {searchMode === 'semantic' && <div className="space-y-2 mb-3">
          <Button variant="outline" size="sm" className="w-full" onClick={handleSyncEmbeddings} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Sync Embeddings
          </Button>
          
          <div className="flex items-center justify-center text-xs text-muted-foreground">
            <Database className="h-3 w-3 mr-1" />
            <span>{indexStatus.indexSize} embeddings</span>
          </div>
        </div>}

      {searchMode === 'semantic' && searchQuery && semanticResults.length > 0 && <div className="space-y-1 mb-3">
          {semanticResults.map(result => <div key={result.noteId} className="p-2 rounded-md border border-transparent hover:border-primary/20 hover:bg-primary/5 cursor-pointer transition-colors" onClick={() => onNoteSelect(result.noteId)}>
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium text-sm truncate">{result.title}</div>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(result.score * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {result.content.slice(0, 80)}...
              </p>
            </div>)}
        </div>}

      {searchMode === 'semantic' && searchQuery && semanticResults.length === 0 && !isSearching && <div className="text-center text-muted-foreground py-4 mb-3">
          <p className="text-sm">No results found</p>
          <p className="text-xs">Try syncing embeddings first</p>
        </div>}
    </div>;
};