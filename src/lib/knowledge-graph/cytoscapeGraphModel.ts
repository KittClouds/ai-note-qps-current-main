
import cytoscape, { Core, ElementDefinition, NodeDefinition, EdgeDefinition } from 'cytoscape';
import { KnowledgeGraph, KnowledgeEntity, KnowledgeTriple } from './types';
import { Note, Folder, FileSystemItem } from '@/types/notes';
import { ParsedConnections } from '@/utils/parsingUtils';

export interface CytoscapeNode {
  data: {
    id: string;
    type: 'folder' | 'note' | 'entity' | 'tag' | 'wikilink' | 'crosslink' | 'attachment';
    label: string;
    properties: Record<string, any>;
  };
}

export interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    type: 'contains' | 'references' | 'mentions' | 'relates' | 'links' | 'parent-child';
    properties: Record<string, any>;
  };
}

export interface CytoscapeGraphData {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
  metadata: {
    generated: string;
    noteCount: number;
    folderCount: number;
    entityCount: number;
    relationshipCount: number;
  };
}

export interface GraphAnalysis {
  centralNodes: Array<{ id: string; centrality: number }>;
  clusters: Array<{ id: string; nodes: string[] }>;
  pathsBetween: (source: string, target: string) => string[];
  subgraph: (nodeIds: string[]) => CytoscapeGraphData;
}

export class CytoscapeGraphModel {
  private cy: Core | null = null;
  private graphData: CytoscapeGraphData | null = null;

  /**
   * Build complete system graph from notes, folders, and their content
   */
  public buildSystemGraph(
    items: FileSystemItem[],
    connectionsMap: Map<string, ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }>,
    knowledgeGraphs: Map<string, KnowledgeGraph>
  ): CytoscapeGraphData {
    console.log('[CytoscapeGraphModel] Building system graph');
    
    const nodes: CytoscapeNode[] = [];
    const edges: CytoscapeEdge[] = [];
    let edgeIdCounter = 0;

    // Process folders and notes
    items.forEach(item => {
      if (item.type === 'folder') {
        nodes.push(this.createFolderNode(item));
      } else if (item.type === 'note') {
        nodes.push(this.createNoteNode(item));
        
        // Add entities from knowledge graph if available
        const knowledgeGraph = knowledgeGraphs.get(item.id);
        if (knowledgeGraph) {
          knowledgeGraph.entities.forEach(entity => {
            nodes.push(this.createEntityNode(entity, item.id));
            edges.push(this.createEdge(`edge-${edgeIdCounter++}`, item.id, entity.id, 'contains', {
              confidence: entity.confidence || 0.8,
              entityType: entity.type
            }));
          });

          // Add relationships from triples
          knowledgeGraph.triples.forEach(triple => {
            edges.push(this.createEdge(`edge-${edgeIdCounter++}`, triple.subject.id, triple.object.id, 'relates', {
              predicate: triple.predicate,
              confidence: triple.confidence || 0.8,
              noteId: item.id
            }));
          });
        }

        // Add connections from parsed content
        const connections = connectionsMap.get(item.id);
        if (connections) {
          // Add tag nodes and edges
          connections.tags.forEach(tag => {
            const tagId = `tag-${tag}`;
            if (!nodes.find(n => n.data.id === tagId)) {
              nodes.push(this.createTagNode(tag));
            }
            edges.push(this.createEdge(`edge-${edgeIdCounter++}`, item.id, tagId, 'mentions', { tag }));
          });

          // Add wikilink edges
          connections.links.forEach(link => {
            const targetNote = items.find(i => i.type === 'note' && i.title === link);
            if (targetNote) {
              edges.push(this.createEdge(`edge-${edgeIdCounter++}`, item.id, targetNote.id, 'links', { 
                linkType: 'wikilink',
                target: link 
              }));
            }
          });

          // Add crosslink edges
          connections.crosslinks.forEach(crosslink => {
            edges.push(this.createEdge(`edge-${edgeIdCounter++}`, item.id, crosslink.noteId, 'references', {
              linkType: 'crosslink',
              label: crosslink.label
            }));
          });
        }
      }

      // Add parent-child relationships
      if (item.parentId) {
        edges.push(this.createEdge(`edge-${edgeIdCounter++}`, item.parentId, item.id, 'parent-child', {
          relationship: 'contains'
        }));
      }
    });

    this.graphData = {
      nodes,
      edges,
      metadata: {
        generated: new Date().toISOString(),
        noteCount: items.filter(i => i.type === 'note').length,
        folderCount: items.filter(i => i.type === 'folder').length,
        entityCount: nodes.filter(n => n.data.type === 'entity').length,
        relationshipCount: edges.length
      }
    };

    console.log(`[CytoscapeGraphModel] Graph built: ${nodes.length} nodes, ${edges.length} edges`);
    return this.graphData;
  }

  /**
   * Build note-specific graph
   */
  public buildNoteGraph(
    note: Note,
    knowledgeGraph: KnowledgeGraph,
    connections: ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }
  ): CytoscapeGraphData {
    console.log('[CytoscapeGraphModel] Building note-specific graph for:', note.title);
    
    const nodes: CytoscapeNode[] = [this.createNoteNode(note)];
    const edges: CytoscapeEdge[] = [];
    let edgeIdCounter = 0;

    // Add entities
    knowledgeGraph.entities.forEach(entity => {
      nodes.push(this.createEntityNode(entity, note.id));
      edges.push(this.createEdge(`edge-${edgeIdCounter++}`, note.id, entity.id, 'contains', {
        confidence: entity.confidence || 0.8,
        entityType: entity.type
      }));
    });

    // Add entity relationships
    knowledgeGraph.triples.forEach(triple => {
      edges.push(this.createEdge(`edge-${edgeIdCounter++}`, triple.subject.id, triple.object.id, 'relates', {
        predicate: triple.predicate,
        confidence: triple.confidence || 0.8
      }));
    });

    // Add tags
    connections.tags.forEach(tag => {
      const tagId = `tag-${tag}`;
      nodes.push(this.createTagNode(tag));
      edges.push(this.createEdge(`edge-${edgeIdCounter++}`, note.id, tagId, 'mentions', { tag }));
    });

    return {
      nodes,
      edges,
      metadata: {
        generated: new Date().toISOString(),
        noteCount: 1,
        folderCount: 0,
        entityCount: knowledgeGraph.entities.length,
        relationshipCount: edges.length
      }
    };
  }

  /**
   * Initialize Cytoscape instance for analysis
   */
  public initializeCytoscape(graphData: CytoscapeGraphData): Core {
    const elements: ElementDefinition[] = [
      ...graphData.nodes.map(node => ({ data: node.data } as NodeDefinition)),
      ...graphData.edges.map(edge => ({ data: edge.data } as EdgeDefinition))
    ];

    this.cy = cytoscape({
      elements,
      headless: true // For computational analysis only
    });

    console.log('[CytoscapeGraphModel] Cytoscape instance initialized');
    return this.cy;
  }

  /**
   * Perform graph analysis
   */
  public analyzeGraph(): GraphAnalysis | null {
    if (!this.cy) {
      console.warn('[CytoscapeGraphModel] Cytoscape not initialized');
      return null;
    }

    // Calculate centrality - fixed to pass includeLoops parameter
    const centralNodes = this.cy.nodes().map(node => ({
      id: node.id(),
      centrality: node.degree(false) // false means don't include loops
    })).sort((a, b) => b.centrality - a.centrality);

    // Simple clustering based on node types
    const clusters = this.groupNodesByType();

    return {
      centralNodes: centralNodes.slice(0, 10), // Top 10 most central
      clusters,
      pathsBetween: (source: string, target: string) => {
        if (!this.cy) return [];
        // Fixed dijkstra API usage
        const dijkstra = this.cy.elements().dijkstra({ root: `#${source}` });
        const path = dijkstra.pathTo(this.cy.$(`#${target}`));
        return path.nodes().map(node => node.id());
      },
      subgraph: (nodeIds: string[]) => this.extractSubgraph(nodeIds)
    };
  }

  /**
   * Export graph as JSON file
   */
  public exportGraphJSON(graphData: CytoscapeGraphData, noteId?: string): string {
    const filename = noteId 
      ? `knowledge-graph-${noteId}-${Date.now()}.json`
      : `system-graph-${Date.now()}.json`;
    
    const exportData = {
      filename,
      generated: new Date().toISOString(),
      graphData,
      cytoscapeFormat: {
        elements: [
          ...graphData.nodes.map(node => ({ data: node.data })),
          ...graphData.edges.map(edge => ({ data: edge.data }))
        ]
      }
    };

    console.log(`[CytoscapeGraphModel] Exporting graph as ${filename}`);
    return JSON.stringify(exportData, null, 2);
  }

  private createFolderNode(folder: Folder): CytoscapeNode {
    return {
      data: {
        id: folder.id,
        type: 'folder',
        label: folder.title,
        properties: {
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
          parentId: folder.parentId
        }
      }
    };
  }

  private createNoteNode(note: Note): CytoscapeNode {
    return {
      data: {
        id: note.id,
        type: 'note',
        label: note.title,
        properties: {
          contentLength: note.content.length,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          parentId: note.parentId
        }
      }
    };
  }

  private createEntityNode(entity: KnowledgeEntity, noteId: string): CytoscapeNode {
    return {
      data: {
        id: entity.id,
        type: 'entity',
        label: entity.value,
        properties: {
          entityType: entity.type,
          confidence: entity.confidence || 0.8,
          noteId,
          start: entity.start,
          end: entity.end
        }
      }
    };
  }

  private createTagNode(tag: string): CytoscapeNode {
    return {
      data: {
        id: `tag-${tag}`,
        type: 'tag',
        label: `#${tag}`,
        properties: {
          tag
        }
      }
    };
  }

  private createEdge(id: string, source: string, target: string, type: CytoscapeEdge['data']['type'], properties: Record<string, any>): CytoscapeEdge {
    return {
      data: {
        id,
        source,
        target,
        type,
        properties
      }
    };
  }

  private groupNodesByType(): Array<{ id: string; nodes: string[] }> {
    if (!this.cy) return [];

    const typeGroups: Record<string, string[]> = {};
    
    // Fixed node iteration - use forEach instead of .map().id()
    this.cy.nodes().forEach(node => {
      const type = node.data('type');
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      typeGroups[type].push(node.id());
    });

    return Object.entries(typeGroups).map(([type, nodes]) => ({
      id: type,
      nodes
    }));
  }

  private extractSubgraph(nodeIds: string[]): CytoscapeGraphData {
    if (!this.cy || !this.graphData) {
      return { nodes: [], edges: [], metadata: { generated: '', noteCount: 0, folderCount: 0, entityCount: 0, relationshipCount: 0 } };
    }

    const selectedNodes = this.cy.nodes().filter(node => nodeIds.includes(node.id()));
    const connectedEdges = selectedNodes.connectedEdges();

    const nodes = this.graphData.nodes.filter(node => nodeIds.includes(node.data.id));
    
    // Fixed edge filtering - properly get edge IDs from Cytoscape collection
    const edgeIds: string[] = [];
    connectedEdges.forEach(cyEdge => {
      edgeIds.push(cyEdge.id());
    });
    
    const edges = this.graphData.edges.filter(edge => 
      edgeIds.includes(edge.data.id)
    );

    return {
      nodes,
      edges,
      metadata: {
        generated: new Date().toISOString(),
        noteCount: nodes.filter(n => n.data.type === 'note').length,
        folderCount: nodes.filter(n => n.data.type === 'folder').length,
        entityCount: nodes.filter(n => n.data.type === 'entity').length,
        relationshipCount: edges.length
      }
    };
  }
}

export const cytoscapeGraphModel = new CytoscapeGraphModel();
