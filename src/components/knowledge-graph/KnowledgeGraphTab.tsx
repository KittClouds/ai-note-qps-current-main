
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { EntityListView } from './EntityListView';
import { EntityFactSheetComponent } from './EntityFactSheet';
import { KnowledgeGraphState, KnowledgeEntity } from '@/lib/knowledge-graph/types';
import { nerServiceManager } from '@/lib/ner/nerServiceManager';
import { knowledgeGraphService } from '@/lib/knowledge-graph/knowledgeGraphService';
import { extractTextFromNoteContent } from '@/lib/ner/textProcessing';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeGraphTabProps {
  selectedNote?: { id: string; title: string; content: any } | null;
}

export const KnowledgeGraphTab: React.FC<KnowledgeGraphTabProps> = ({ selectedNote }) => {
  const [state, setState] = useState<KnowledgeGraphState>({
    view: 'initial',
    knowledgeGraph: null,
    selectedEntity: null,
    factSheet: null,
    status: '',
    error: null
  });
  
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset state when note changes
  React.useEffect(() => {
    if (selectedNote?.id !== currentNoteId) {
      setState({
        view: 'initial',
        knowledgeGraph: null,
        selectedEntity: null,
        factSheet: null,
        status: '',
        error: null
      });
      setCurrentNoteId(selectedNote?.id || null);
    }
  }, [selectedNote?.id, currentNoteId]);

  const handleGenerateKnowledgeGraph = useCallback(async () => {
    if (!selectedNote) return;

    console.log('[KnowledgeGraph] Starting knowledge graph generation for note:', selectedNote.title);
    
    setState(prev => ({
      ...prev,
      view: 'loading',
      status: 'Extracting text from note...',
      error: null
    }));

    try {
      // Extract plain text from the selected note's content
      const plainText = extractTextFromNoteContent(selectedNote.content);
      
      console.log('[KnowledgeGraph] Extracted text length:', plainText?.length || 0);
      
      if (!plainText.trim()) {
        setState(prev => ({
          ...prev,
          view: 'initial',
          status: '',
          error: 'No text content found in note'
        }));
        toast({
          title: "No Text Found",
          description: "The selected note doesn't contain any text to analyze.",
          variant: "destructive"
        });
        return;
      }
      
      if (plainText.trim().length < 20) {
        setState(prev => ({
          ...prev,
          view: 'initial',
          status: '',
          error: 'Text too short for meaningful analysis'
        }));
        toast({
          title: "Text Too Short",
          description: "The note needs more text content for knowledge graph extraction.",
          variant: "destructive"
        });
        return;
      }
      
      setState(prev => ({
        ...prev,
        status: 'Generating knowledge graph with AI...'
      }));
      
      const result = await nerServiceManager.extractKnowledgeGraph(plainText);
      
      console.log('[KnowledgeGraph] Knowledge graph result:', result);
      
      setState(prev => ({
        ...prev,
        view: 'entity-list',
        knowledgeGraph: result.knowledgeGraph,
        status: '',
        error: null
      }));
      
      toast({
        title: "Knowledge Graph Generated",
        description: `Found ${result.knowledgeGraph.totalEntities} entities and ${result.knowledgeGraph.totalTriples} relationships`,
      });
      
    } catch (error) {
      console.error('[KnowledgeGraph] Error during generation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        view: 'initial',
        status: '',
        error: errorMessage
      }));
      
      toast({
        title: "Knowledge Graph Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [selectedNote, toast]);

  const handleEntityClick = useCallback((entity: KnowledgeEntity) => {
    if (!state.knowledgeGraph) return;
    
    const factSheet = knowledgeGraphService.generateEntityFactSheet(entity, state.knowledgeGraph);
    
    setState(prev => ({
      ...prev,
      view: 'fact-sheet',
      selectedEntity: entity,
      factSheet
    }));
  }, [state.knowledgeGraph]);

  const handleBackClick = useCallback(() => {
    setState(prev => ({
      ...prev,
      view: 'entity-list',
      selectedEntity: null,
      factSheet: null
    }));
  }, []);

  const serviceStatus = nerServiceManager.getStatus();
  const currentModel = nerServiceManager.getCurrentModel();

  if (state.view === 'initial') {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-500" />
          <h3 className="text-lg font-semibold mb-2">Knowledge Graph</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Generate an interactive knowledge graph showing entities and their relationships from your note
          </p>
          
          {selectedNote ? (
            <Button 
              onClick={handleGenerateKnowledgeGraph}
              disabled={false}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Brain className="h-4 w-4 mr-2" />
              Generate Knowledge Graph
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a note to generate its knowledge graph
            </p>
          )}

          {currentModel && (
            <div className="mt-4 text-xs text-muted-foreground">
              Using {currentModel.name}
            </div>
          )}
          
          {state.error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{state.error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.view === 'loading') {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-purple-500" />
          <h3 className="text-lg font-semibold mb-2">Generating Knowledge Graph</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {state.status || 'Processing...'}
          </p>
          <div className="max-w-sm mx-auto bg-muted rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (state.view === 'entity-list' && state.knowledgeGraph) {
    return (
      <EntityListView
        entities={state.knowledgeGraph.entities}
        onEntityClick={handleEntityClick}
        provider={serviceStatus.provider}
      />
    );
  }

  if (state.view === 'fact-sheet' && state.factSheet) {
    return (
      <EntityFactSheetComponent
        factSheet={state.factSheet}
        onBackClick={handleBackClick}
        onEntityClick={handleEntityClick}
      />
    );
  }

  return null;
};
