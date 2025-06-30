import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Link, Hash, AtSign, Database, GitBranch, Brain, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ParsedConnections } from '@/utils/parsingUtils';
import { nerServiceManager, AVAILABLE_NER_MODELS, UnifiedModelInfo, UnifiedNERResult } from '@/lib/ner/nerServiceManager';
import { extractTextFromNoteContent } from '@/lib/ner/textProcessing';
import { useToast } from '@/hooks/use-toast';
import { KnowledgeGraphTab } from './knowledge-graph/KnowledgeGraphTab';

interface ConnectionsPanelProps {
  connections: (ParsedConnections & { crosslinks?: Array<{ noteId: string; label: string }> }) | null;
  selectedNote?: { id: string; title: string; content: any } | null;
  isOpen: boolean;
  onToggle: () => void;
}

const ConnectionsPanel = ({ connections, selectedNote, isOpen, onToggle }: ConnectionsPanelProps) => {
  const [entitiesExpanded, setEntitiesExpanded] = useState(true);
  const [relationshipsExpanded, setRelationshipsExpanded] = useState(true);
  const [nerEntitiesExpanded, setNerEntitiesExpanded] = useState(true);
  const [isRunningNER, setIsRunningNER] = useState(false);
  const [nerResult, setNerResult] = useState<UnifiedNERResult | null>(null);
  const [nerStatus, setNerStatus] = useState<string>('');
  const [nerNoteId, setNerNoteId] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<UnifiedModelInfo | null>(null);
  const [isModelSwitching, setIsModelSwitching] = useState(false);
  const { toast } = useToast();

  const entityCount = connections?.entities.length || 0;
  const tripleCount = connections?.triples.length || 0;
  const linkCount = connections?.links.length || 0;
  const crosslinkCount = connections?.crosslinks?.length || 0;
  const nerEntityCount = nerResult?.entities.length || 0;

  // Clear NER state when note changes
  React.useEffect(() => {
    if (selectedNote?.id !== nerNoteId) {
      setNerResult(null);
      setNerStatus('');
      setNerNoteId(null);
    }
  }, [selectedNote?.id, nerNoteId]);

  // Initialize current model on component mount
  React.useEffect(() => {
    const serviceStatus = nerServiceManager.getStatus();
    if (serviceStatus.isInitialized) {
      setCurrentModel(nerServiceManager.getCurrentModel());
    }
  }, []);

  const handleModelChange = useCallback(async (modelId: string) => {
    console.log('[ConnectionsPanel] Switching to model:', modelId);
    const targetModel = AVAILABLE_NER_MODELS.find(model => model.id === modelId);
    
    setIsModelSwitching(true);
    setNerStatus(`Switching to ${targetModel?.name || modelId}...`);
    
    try {
      await nerServiceManager.switchModel(modelId);
      const newModel = nerServiceManager.getCurrentModel();
      setCurrentModel(newModel);
      setNerStatus('');
      
      // Clear previous results when switching models
      setNerResult(null);
      setNerNoteId(null);
      
      toast({
        title: "Model Switched",
        description: `Now using ${newModel?.name || modelId}`,
      });
    } catch (error) {
      console.error('[ConnectionsPanel] Error switching model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch model';
      setNerStatus(`Model switch failed: ${errorMessage}`);
      
      toast({
        title: "Model Switch Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsModelSwitching(false);
    }
  }, [toast]);

  const handleRunNER = useCallback(async () => {
    if (!selectedNote || isRunningNER) return;
    
    console.log('[ConnectionsPanel] Starting NER analysis for note:', selectedNote.title);
    setIsRunningNER(true);
    setNerStatus('Extracting text from note...');
    
    try {
      // Extract plain text from the selected note's content
      const plainText = extractTextFromNoteContent(selectedNote.content);
      
      console.log('[ConnectionsPanel] Extracted text length:', plainText?.length || 0);
      
      if (!plainText.trim()) {
        console.warn('[ConnectionsPanel] No text content found');
        setNerStatus('No text content found in note');
        toast({
          title: "No Text Found",
          description: "The selected note doesn't contain any text to analyze.",
          variant: "destructive"
        });
        setNerResult(null);
        setNerNoteId(selectedNote.id);
        return;
      }
      
      // Check if text is too short
      if (plainText.trim().length < 10) {
        setNerStatus('Text too short for meaningful analysis');
        toast({
          title: "Text Too Short",
          description: "The note needs more text content for NER analysis.",
          variant: "destructive"
        });
        setNerResult(null);
        setNerNoteId(selectedNote.id);
        return;
      }
      
      setNerStatus('Initializing NER service...');
      
      // Get current service status
      const serviceStatus = nerServiceManager.getStatus();
      console.log('[ConnectionsPanel] NER service status:', serviceStatus);
      
      if (serviceStatus.hasError) {
        setNerStatus(`Service error: ${serviceStatus.errorMessage}`);
        toast({
          title: "NER Service Error",
          description: serviceStatus.errorMessage || "Unknown error occurred",
          variant: "destructive"
        });
        return;
      }
      
      const providerName = serviceStatus.provider === 'gemini' ? 'Gemini' : 'Wink NLP';
      setNerStatus(`Running ${providerName} analysis...`);
      
      const result = await nerServiceManager.extractEntities(plainText);
      
      console.log('[ConnectionsPanel] NER result:', result);
      
      setNerResult(result);
      setNerNoteId(selectedNote.id);
      setNerStatus('');
      
      // Update current model info
      setCurrentModel(nerServiceManager.getCurrentModel());
      
      // Show success toast with results
      toast({
        title: "NER Analysis Complete",
        description: `Found ${result.totalCount} entities using ${providerName} in ${result.processingTime}ms`,
      });
      
    } catch (error) {
      console.error('[ConnectionsPanel] Error during NER analysis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setNerStatus(`Error: ${errorMessage}`);
      setNerResult(null);
      setNerNoteId(selectedNote.id);
      
      toast({
        title: "NER Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsRunningNER(false);
    }
  }, [selectedNote, isRunningNER, toast]);

  const handleReinitializeNER = useCallback(async () => {
    setNerStatus('Reinitializing NER service...');
    try {
      await nerServiceManager.reinitialize();
      setCurrentModel(nerServiceManager.getCurrentModel());
      setNerStatus('');
      toast({
        title: "NER Service Reinitialized",
        description: "The service has been reset and is ready to use.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reinitialize';
      setNerStatus(`Reinitialization failed: ${errorMessage}`);
      toast({
        title: "Reinitialization Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast]);

  const groupedNerEntities = nerResult?.entities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<string, typeof nerResult.entities>) || {};

  const serviceStatus = nerServiceManager.getStatus();

  // Only show NER entities if they belong to the current note
  const showNerEntities = nerEntityCount > 0 && nerNoteId === selectedNote?.id;

  return (
    <div className="border-t bg-background">
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-3 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              <span className="font-medium">Connections</span>
              <span className="text-sm text-muted-foreground">
                {entityCount} entities, {crosslinkCount} crosslinks
              </span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="border-t">
          <div className="p-4 space-y-4">
            <Tabs defaultValue="knowledge-graph" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="knowledge-graph" className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  Knowledge
                </TabsTrigger>
                <TabsTrigger value="crosslinks" className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  Cross ({crosslinkCount})
                </TabsTrigger>
                <TabsTrigger value="links" className="flex items-center gap-1">
                  <Link className="h-3 w-3" />
                  Links ({linkCount})
                </TabsTrigger>
                <TabsTrigger value="entities" className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Entities ({entityCount})
                </TabsTrigger>
                <TabsTrigger value="related" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Related ({tripleCount})
                </TabsTrigger>
                <TabsTrigger value="ner" className="flex items-center gap-1">
                  <AtSign className="h-3 w-3" />
                  NER ({showNerEntities ? nerEntityCount : 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="knowledge-graph" className="mt-4">
                <KnowledgeGraphTab selectedNote={selectedNote} />
              </TabsContent>

              <TabsContent value="ner" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Named Entity Recognition</h3>
                    <div className="flex items-center gap-2">
                      {serviceStatus.hasError && (
                        <Button 
                          onClick={handleReinitializeNER}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      )}
                      <Button 
                        onClick={handleRunNER}
                        disabled={isRunningNER || !selectedNote || isModelSwitching}
                        size="sm"
                        variant="outline"
                      >
                        {isRunningNER ? 'Running...' : 'Run Analysis'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Model Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Model:</span>
                    <Select 
                      value={currentModel?.id || AVAILABLE_NER_MODELS[0].id} 
                      onValueChange={handleModelChange}
                      disabled={isModelSwitching || isRunningNER}
                    >
                      <SelectTrigger className="w-auto min-w-[250px] h-8 text-xs">
                        <SelectValue placeholder="Select model..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_NER_MODELS.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-muted-foreground">{model.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isModelSwitching && (
                      <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Service Status Display */}
                  {(serviceStatus.hasError || nerStatus || serviceStatus.isLoading || isModelSwitching) && (
                    <div className={`p-3 rounded-md text-sm ${
                      serviceStatus.hasError ? 'bg-destructive/10 text-destructive' :
                      serviceStatus.isLoading || isRunningNER || isModelSwitching ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' :
                      'bg-muted'
                    }`}>
                      {serviceStatus.hasError && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          <span>Error: {serviceStatus.errorMessage}</span>
                        </div>
                      )}
                      {nerStatus && (
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          <span>{nerStatus}</span>
                        </div>
                      )}
                      {(serviceStatus.isLoading || isModelSwitching) && !nerStatus && (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>{isModelSwitching ? 'Switching model...' : 'Loading NER service...'}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!selectedNote && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No note selected</p>
                    </div>
                  )}
                  
                  {selectedNote && !showNerEntities && !isRunningNER && !nerStatus && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No named entities detected</p>
                      <p className="text-xs">Click "Run Analysis" to analyze the current note</p>
                    </div>
                  )}
                  
                  {showNerEntities && (
                    <Collapsible open={nerEntitiesExpanded} onOpenChange={setNerEntitiesExpanded}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            <span className="font-medium">Named Entities ({nerEntityCount})</span>
                            <span className="text-xs px-2 py-1 bg-muted rounded">
                              {nerResult?.provider}
                            </span>
                          </div>
                          {nerEntitiesExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="mt-2">
                        <div className="space-y-4 pl-4">
                          {Object.entries(groupedNerEntities).map(([type, entities]) => (
                            <div key={type} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-muted rounded font-mono">
                                  {type}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {entities.length} entities
                                </span>
                              </div>
                              <div className="space-y-1 ml-4">
                                {entities.map((entity, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{entity.value}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {entity.start}-{entity.end}
                                      </span>
                                    </div>
                                    {entity.confidence && (
                                      <span className="text-xs text-muted-foreground">
                                        {(entity.confidence * 100).toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="crosslinks" className="mt-4">
                {connections?.crosslinks?.length ? (
                  <div className="space-y-2">
                    {connections.crosslinks.map((crosslink, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                        <GitBranch className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{crosslink.label}</span>
                        <span className="text-xs text-muted-foreground">→ {crosslink.noteId}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No cross-note links found</p>
                    <p className="text-xs">Use &lt;&lt;note title&gt;&gt; syntax to link to other notes</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="links" className="mt-4">
                {connections?.links.length ? (
                  <div className="space-y-2">
                    {connections.links.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                        <Link className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{link}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No links found</p>
                    <p className="text-xs">Use [[link]] syntax to create links</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="entities" className="mt-4">
                <Collapsible open={entitiesExpanded} onOpenChange={setEntitiesExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span className="font-medium">Entities ({entityCount})</span>
                      </div>
                      {entitiesExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-2">
                    {connections?.entities.length ? (
                      <div className="space-y-2 pl-4">
                        {connections.entities.map((entity, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                            <span className="text-xs px-2 py-1 bg-muted rounded font-mono">
                              {entity.kind}
                            </span>
                            <span className="text-sm">{entity.label}</span>
                            {entity.attributes && (
                              <span className="text-xs text-muted-foreground">
                                {Object.keys(entity.attributes).length} attributes
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground pl-4">
                        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No entities found</p>
                        <p className="text-xs">Use [KIND|label] syntax to create entities</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>

              <TabsContent value="related" className="mt-4">
                <Collapsible open={relationshipsExpanded} onOpenChange={setRelationshipsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span className="font-medium">Relationships ({tripleCount})</span>
                      </div>
                      {relationshipsExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-2">
                    {connections?.triples.length ? (
                      <div className="space-y-3 pl-4">
                        {connections.triples.map((triple, index) => (
                          <div key={index} className="p-3 rounded-md border bg-muted/20 hover:bg-muted/30">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono">
                                {triple.subject.kind}
                              </span>
                              <span className="font-medium">{triple.subject.label}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-xs px-2 py-1 bg-muted rounded">
                                {triple.predicate}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded text-xs font-mono">
                                {triple.object.kind}
                              </span>
                              <span className="font-medium">{triple.object.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground pl-4">
                        <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No relationships found</p>
                        <p className="text-xs">Use [SUBJ|label] (predicate) [OBJ|label] syntax</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ConnectionsPanel;
