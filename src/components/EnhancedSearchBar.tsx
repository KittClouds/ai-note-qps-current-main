
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Zap, Database, FileText, Blend } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { embeddingsService, SearchResult } from '@/lib/embeddings/embeddingsService';
import { bm25Service, BM25SearchResult } from '@/lib/bm25/bm25Service';
import { hybridSearchService, HybridSearchResult } from '@/lib/search/hybridSearchService';
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
  const [searchMode, setSearchMode] = useState<'text' | 'semantic' | 'hybrid'>('text');
  const [semanticSubMode, setSemanticSubMode] = useState<'semantic' | 'bm25'>('semantic');
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [bm25Results, setBm25Results] = useState<BM25SearchResult[]>([]);
  const [hybridResults, setHybridResults] = useState<HybridSearchResult[]>([]);
  const [alpha, setAlpha] = useState([0.5]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [indexStatus, setIndexStatus] = useState({
    hasIndex: false,
    indexSize: 0,
    needsRebuild: false,
    graphNodes: 0,
    graphEdges: 0
  });
  const [bm25IndexStatus, setBm25IndexStatus] = useState({
    hasIndex: false,
    indexSize: 0,
    totalDocuments: 0,
    totalTerms: 0,
    needsRebuild: false
  });
  const { toast } = useToast();

  useEffect(() => {
    const status = embeddingsService.getIndexStatus();
    setIndexStatus(status);
    const bm25Status = bm25Service.getIndexStatus();
    setBm25IndexStatus(bm25Status);
  }, []);

  const handleSemanticSearch = useDebouncedCallback(async (query: string) => {
    if (!query.trim() || searchMode !== 'semantic' || semanticSubMode !== 'semantic') {
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

  const handleBM25Search = useDebouncedCallback(async (query: string) => {
    if (!query.trim() || searchMode !== 'semantic' || semanticSubMode !== 'bm25') {
      setBm25Results([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await bm25Service.search(query, 10);
      setBm25Results(results);
    } catch (error) {
      console.error('BM25 search failed:', error);
      toast({
        title: "Search failed",
        description: "Could not perform BM25 search. Try syncing the index first.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  }, 300);

  const handleHybridSearch = useDebouncedCallback(async (query: string) => {
    if (!query.trim() || searchMode !== 'hybrid') {
      setHybridResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await hybridSearchService.search(query, {
        limit: 10,
        alpha: alpha[0]
      });
      setHybridResults(results);
    } catch (error) {
      console.error('Hybrid search failed:', error);
      toast({
        title: "Search failed",
        description: "Could not perform hybrid search. Try syncing both indexes first.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  }, 500);

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    if (searchMode === 'semantic') {
      if (semanticSubMode === 'semantic') {
        handleSemanticSearch(value);
      } else {
        handleBM25Search(value);
      }
    } else if (searchMode === 'hybrid') {
      handleHybridSearch(value);
    }
  };

  const handleModeChange = (mode: 'text' | 'semantic' | 'hybrid') => {
    setSearchMode(mode);
    setSemanticResults([]);
    setBm25Results([]);
    setHybridResults([]);
    
    if (mode === 'semantic' && searchQuery.trim()) {
      if (semanticSubMode === 'semantic') {
        handleSemanticSearch(searchQuery);
      } else {
        handleBM25Search(searchQuery);
      }
    } else if (mode === 'hybrid' && searchQuery.trim()) {
      handleHybridSearch(searchQuery);
    }
  };

  const handleSemanticSubModeChange = (isBM25: boolean) => {
    const newSubMode = isBM25 ? 'bm25' : 'semantic';
    setSemanticSubMode(newSubMode);
    setSemanticResults([]);
    setBm25Results([]);
    
    if (searchMode === 'semantic' && searchQuery.trim()) {
      if (newSubMode === 'semantic') {
        handleSemanticSearch(searchQuery);
      } else {
        handleBM25Search(searchQuery);
      }
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

  const handleSyncBM25 = async () => {
    setIsSyncing(true);
    try {
      const count = bm25Service.syncAllNotes(notes);
      const newStatus = bm25Service.getIndexStatus();
      setBm25IndexStatus(newStatus);
      toast({
        title: "BM25 index synced",
        description: `Successfully indexed ${count} documents with ${newStatus.totalTerms} unique terms`
      });
    } catch (error) {
      console.error('BM25 sync failed:', error);
      toast({
        title: "Sync failed",
        description: "Could not sync BM25 index. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncHybrid = async () => {
    setIsSyncing(true);
    try {
      await hybridSearchService.syncAllNotes(notes);
      const newStatus = embeddingsService.getIndexStatus();
      const newBM25Status = bm25Service.getIndexStatus();
      setIndexStatus(newStatus);
      setBm25IndexStatus(newBM25Status);
      toast({
        title: "Hybrid indexes synced",
        description: `Successfully synced both BM25 and semantic indexes`
      });
    } catch (error) {
      console.error('Hybrid sync failed:', error);
      toast({
        title: "Sync failed",
        description: "Could not sync hybrid indexes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAlphaChange = (value: number[]) => {
    setAlpha(value);
    if (searchMode === 'hybrid' && searchQuery.trim()) {
      handleHybridSearch(searchQuery);
    }
  };

  const getSearchPlaceholder = () => {
    if (searchMode === 'text') {
      return "Search notes... (Ctrl+K)";
    } else if (searchMode === 'semantic') {
      return semanticSubMode === 'semantic' ? "Semantic search..." : "BM25 search...";
    } else if (searchMode === 'hybrid') {
      return "Hybrid search (keyword + semantic)...";
    }
    return "Search notes...";
  };

  return (
    <div className={className}>
      <Tabs value={searchMode} onValueChange={handleModeChange} className="w-full mb-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text" className="text-xs">Folders</TabsTrigger>
          <TabsTrigger value="semantic" className="text-xs">Semantic</TabsTrigger>
          <TabsTrigger value="hybrid" className="text-xs">Hybrid</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input 
          id="search-input" 
          placeholder={getSearchPlaceholder()} 
          value={searchQuery} 
          onChange={e => handleSearchChange(e.target.value)} 
          className="pl-9 bg-background/50 border-input/50 focus:bg-background focus:border-primary/50 transition-all" 
        />
        {isSearching && (
          <Loader2 size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {searchMode === 'semantic' && (
        <div className="space-y-3 mb-3">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Semantic</span>
            </div>
            <Switch
              checked={semanticSubMode === 'bm25'}
              onCheckedChange={handleSemanticSubModeChange}
            />
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">BM25</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </div>

          {semanticSubMode === 'semantic' ? (
            <>
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
              
              <div className="flex items-center justify-center text-xs text-muted-foreground">
                <Database className="h-3 w-3 mr-1" />
                <span>{indexStatus.indexSize} embeddings</span>
              </div>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={handleSyncBM25} 
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Sync BM25 Index
              </Button>
              
              <div className="flex items-center justify-center text-xs text-muted-foreground">
                <Database className="h-3 w-3 mr-1" />
                <span>{bm25IndexStatus.totalDocuments} docs, {bm25IndexStatus.totalTerms} terms</span>
              </div>
            </>
          )}
        </div>
      )}

      {searchMode === 'hybrid' && (
        <div className="space-y-3 mb-3">
          <div className="p-3 bg-muted/30 rounded-lg space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <Blend className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Hybrid Search</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Keyword</span>
                <span>Semantic</span>
              </div>
              <Slider
                value={alpha}
                onValueChange={handleAlphaChange}
                max={1}
                min={0}
                step={0.05}
                className="w-full"
              />
              <div className="text-center text-xs text-muted-foreground">
                Alpha: {alpha[0].toFixed(2)}
              </div>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={handleSyncHybrid} 
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Blend className="h-4 w-4 mr-2" />
            )}
            Sync Hybrid Indexes
          </Button>
          
          <div className="flex items-center justify-center text-xs text-muted-foreground">
            <Database className="h-3 w-3 mr-1" />
            <span>BM25: {bm25IndexStatus.totalDocuments} | Embeddings: {indexStatus.indexSize}</span>
          </div>
        </div>
      )}

      {searchMode === 'semantic' && semanticSubMode === 'semantic' && searchQuery && semanticResults.length > 0 && (
        <div className="space-y-1 mb-3">
          {semanticResults.map(result => (
            <div 
              key={result.noteId} 
              className="p-2 rounded-md border border-transparent hover:border-primary/20 hover:bg-primary/5 cursor-pointer transition-colors" 
              onClick={() => onNoteSelect(result.noteId)}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium text-sm truncate">{result.title}</div>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(result.score * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {result.content.slice(0, 80)}...
              </p>
            </div>
          ))}
        </div>
      )}

      {searchMode === 'semantic' && semanticSubMode === 'bm25' && searchQuery && bm25Results.length > 0 && (
        <div className="space-y-1 mb-3">
          {bm25Results.map(result => (
            <div 
              key={result.noteId} 
              className="p-2 rounded-md border border-transparent hover:border-primary/20 hover:bg-primary/5 cursor-pointer transition-colors" 
              onClick={() => onNoteSelect(result.noteId)}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium text-sm truncate">{result.title}</div>
                <Badge variant="secondary" className="text-xs">
                  {result.score.toFixed(2)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {result.content.slice(0, 80)}...
              </p>
            </div>
          ))}
        </div>
      )}

      {searchMode === 'hybrid' && searchQuery && hybridResults.length > 0 && (
        <div className="space-y-1 mb-3">
          {hybridResults.map(result => (
            <div 
              key={result.noteId} 
              className="p-2 rounded-md border border-transparent hover:border-primary/20 hover:bg-primary/5 cursor-pointer transition-colors" 
              onClick={() => onNoteSelect(result.noteId)}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium text-sm truncate">{result.title}</div>
                <Badge variant="secondary" className="text-xs">
                  {result.fusedScore.toFixed(2)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {result.content.slice(0, 80)}...
              </p>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>BM25: {result.sparseScore?.toFixed(2) || 'N/A'}</span>
                <span>Semantic: {result.denseScore?.toFixed(2) || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchMode === 'semantic' && searchQuery && 
       ((semanticSubMode === 'semantic' && semanticResults.length === 0 && !isSearching) ||
        (semanticSubMode === 'bm25' && bm25Results.length === 0 && !isSearching)) && (
        <div className="text-center text-muted-foreground py-4 mb-3">
          <p className="text-sm">No results found</p>
          <p className="text-xs">Try syncing the index first</p>
        </div>
      )}

      {searchMode === 'hybrid' && searchQuery && hybridResults.length === 0 && !isSearching && (
        <div className="text-center text-muted-foreground py-4 mb-3">
          <p className="text-sm">No hybrid results found</p>
          <p className="text-xs">Try syncing both indexes first</p>
        </div>
      )}
    </div>
  );
};
