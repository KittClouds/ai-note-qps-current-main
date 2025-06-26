import React, { useState, useEffect } from 'react';
import { Search, Loader2, Zap, Database, FileText, Blend } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { embeddingsService, SearchResult } from '@/lib/embeddings/embeddingsService';
import { bm25Service, BM25SearchResult } from '@/lib/bm25/bm25Service';
import { hybridSearchService, HybridSearchResult } from '@/lib/search/hybridSearchService';
import { Note } from '@/types/notes';
import { useToast } from '@/hooks/use-toast';
import { EmbeddingProviderSelector } from './EmbeddingProviderSelector';

interface EnhancedSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notes: Note[];
  onNoteSelect: (id: string) => void;
  className?: string;
}

type SearchMode = 'text' | 'semantic';
type SemanticMode = 'semantic' | 'bm25' | 'hybrid';

export const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  notes,
  onNoteSelect,
  className = ''
}) => {
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  const [semanticMode, setSemanticMode] = useState<SemanticMode>('semantic');
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
    if (!query.trim() || searchMode !== 'semantic' || semanticMode !== 'semantic') {
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
    if (!query.trim() || searchMode !== 'semantic' || semanticMode !== 'bm25') {
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
    if (!query.trim() || searchMode !== 'semantic' || semanticMode !== 'hybrid') {
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
      if (semanticMode === 'semantic') {
        handleSemanticSearch(value);
      } else if (semanticMode === 'bm25') {
        handleBM25Search(value);
      } else if (semanticMode === 'hybrid') {
        handleHybridSearch(value);
      }
    }
  };

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    setSemanticResults([]);
    setBm25Results([]);
    setHybridResults([]);
    
    if (mode === 'semantic' && searchQuery.trim()) {
      if (semanticMode === 'semantic') {
        handleSemanticSearch(searchQuery);
      } else if (semanticMode === 'bm25') {
        handleBM25Search(searchQuery);
      } else if (semanticMode === 'hybrid') {
        handleHybridSearch(searchQuery);
      }
    }
  };

  const handleSemanticModeChange = (mode: SemanticMode) => {
    setSemanticMode(mode);
    setSemanticResults([]);
    setBm25Results([]);
    setHybridResults([]);
    
    if (searchMode === 'semantic' && searchQuery.trim()) {
      if (mode === 'semantic') {
        handleSemanticSearch(searchQuery);
      } else if (mode === 'bm25') {
        handleBM25Search(searchQuery);
      } else if (mode === 'hybrid') {
        handleHybridSearch(searchQuery);
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
    if (searchMode === 'semantic' && semanticMode === 'hybrid' && searchQuery.trim()) {
      handleHybridSearch(searchQuery);
    }
  };

  const getSearchPlaceholder = () => {
    if (searchMode === 'text') {
      return "Search notes... (Ctrl+K)";
    } else if (searchMode === 'semantic') {
      if (semanticMode === 'semantic') return "Semantic search...";
      if (semanticMode === 'bm25') return "BM25 search...";
      if (semanticMode === 'hybrid') return "Hybrid search (keyword + semantic)...";
    }
    return "Search notes...";
  };

  return (
    <div className={className}>
      <Tabs value={searchMode} onValueChange={handleModeChange} className="w-full mb-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text" className="text-xs">Folders</TabsTrigger>
          <TabsTrigger value="semantic" className="text-xs">Semantic</TabsTrigger>
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
          <EmbeddingProviderSelector />
          
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-primary" />
              <button
                onClick={() => handleSemanticModeChange('semantic')}
                className={`text-sm font-medium transition-colors ${
                  semanticMode === 'semantic' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Semantic
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-primary" />
              <button
                onClick={() => handleSemanticModeChange('bm25')}
                className={`text-sm font-medium transition-colors ${
                  semanticMode === 'bm25' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                BM25
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Blend className="h-4 w-4 text-primary" />
              <button
                onClick={() => handleSemanticModeChange('hybrid')}
                className={`text-sm font-medium transition-colors ${
                  semanticMode === 'hybrid' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Hybrid
              </button>
            </div>
          </div>

          {semanticMode === 'hybrid' && (
            <div className="p-3 bg-muted/20 rounded-lg space-y-3">
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
          )}

          {semanticMode === 'semantic' && (
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
          )}

          {semanticMode === 'bm25' && (
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

          {semanticMode === 'hybrid' && (
            <>
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
            </>
          )}
        </div>
      )}

      {searchMode === 'semantic' && semanticMode === 'semantic' && searchQuery && semanticResults.length > 0 && (
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

      {searchMode === 'semantic' && semanticMode === 'bm25' && searchQuery && bm25Results.length > 0 && (
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

      {searchMode === 'semantic' && semanticMode === 'hybrid' && searchQuery && hybridResults.length > 0 && (
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
       ((semanticMode === 'semantic' && semanticResults.length === 0 && !isSearching) ||
        (semanticMode === 'bm25' && bm25Results.length === 0 && !isSearching) ||
        (semanticMode === 'hybrid' && hybridResults.length === 0 && !isSearching)) && (
        <div className="text-center text-muted-foreground py-4 mb-3">
          <p className="text-sm">No results found</p>
          <p className="text-xs">Try syncing the index first</p>
        </div>
      )}
    </div>
  );
};
