import { useState } from 'react';
import { ChevronDown, ChevronRight, Link, Hash, AtSign, Database, GitBranch, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ParsedConnections } from '@/utils/parsingUtils';
import { nerService, NEREntity } from '@/lib/ner/nerService';
import { extractTextFromNoteContent } from '@/lib/ner/textProcessing';

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
  const [nerEntities, setNerEntities] = useState<NEREntity[]>([]);

  const entityCount = connections?.entities.length || 0;
  const tripleCount = connections?.triples.length || 0;
  const linkCount = connections?.links.length || 0;
  const crosslinkCount = connections?.crosslinks?.length || 0;
  const nerEntityCount = nerEntities.length;

  const handleRunNER = async () => {
    if (!selectedNote || isRunningNER) return;
    
    setIsRunningNER(true);
    try {
      // Extract plain text from the selected note's content
      const plainText = extractTextFromNoteContent(selectedNote.content);
      
      if (!plainText.trim()) {
        console.warn('No text content found in the selected note');
        setNerEntities([]);
        return;
      }
      
      const result = await nerService.extractEntities(plainText);
      setNerEntities(result.entities);
    } catch (error) {
      console.error('Error running NER analysis:', error);
      setNerEntities([]);
    } finally {
      setIsRunningNER(false);
    }
  };

  const groupedNerEntities = nerEntities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<string, NEREntity[]>);

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
            <Tabs defaultValue="crosslinks" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
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
                  <Brain className="h-3 w-3" />
                  NER ({nerEntityCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ner" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Named Entity Recognition</h3>
                    <Button 
                      onClick={handleRunNER}
                      disabled={isRunningNER || nerService.isLoading() || !selectedNote}
                      size="sm"
                      variant="outline"
                    >
                      {isRunningNER ? 'Running...' : 'Run NER Analysis'}
                    </Button>
                  </div>
                  
                  {!selectedNote && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No note selected</p>
                    </div>
                  )}
                  
                  {selectedNote && nerService.isLoading() && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">NER service is initializing...</p>
                    </div>
                  )}
                  
                  {selectedNote && !nerService.isLoading() && nerEntityCount === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No named entities detected</p>
                      <p className="text-xs">Click "Run NER Analysis" to analyze the current note</p>
                    </div>
                  )}
                  
                  {nerEntityCount > 0 && (
                    <Collapsible open={nerEntitiesExpanded} onOpenChange={setNerEntitiesExpanded}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            <span className="font-medium">Named Entities ({nerEntityCount})</span>
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
                                  <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                    <span className="text-sm font-medium">{entity.value}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {entity.start}-{entity.end}
                                    </span>
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
