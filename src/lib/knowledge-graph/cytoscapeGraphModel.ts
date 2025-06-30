import cytoscape, { Core, ElementDefinition, NodeDefinition, EdgeDefinition } from 'cytoscape';
import { KnowledgeGraph, KnowledgeEntity, KnowledgeTriple } from './types';
import { Note, Folder, FileSystemItem } from '@/types/notes';
import { ParsedConnections } from '@/utils/parsingUtils';

export interface CytoscapeNode {
  data: {
    id: string;
    type: 'folder' | 'note' | 'entity' | 'tag' | 'wikilink' | 'crosslink' | 'attachment';
    label: string;
    parent?: string; // Added for compound nodes
    properties: Record<string, any>;
  };
}

export interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    type: 'contains' | 'references' | 'mentions' | 'relates' | 'links';
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

export interface AdvancedCentralityMetrics {
  id: string;
  degree: number;
  pageRank: number;
  betweenness: number;
  closeness: number;
}

export interface GraphAnalysis {
  centralNodes: AdvancedCentralityMetrics[];
  clusters: Array<{ id: string; nodes: string[]; modularity?: number }>;
  pathsBetween: (source: string, target: string) => string[];
  subgraph: (nodeIds: string[]) => CytoscapeGraphData;
  hierarchicalStructure: {
    rootNodes: string[];
    maxDepth: number;
    compoundRelations: Array<{ parent: string; children: string[] }>;
  };
}

export class CytoscapeGraphModel {
  private cy: Core | null = null;
  private graphData: CytoscapeGraphData | null = null;

  /**
   * Build complete system graph from notes, folders, and their content
   * Enhanced with compound node structure
   */
  public buildSystemGraph(
    items: FileSystemItem[],
    connectionsMap: Map<string, ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }>,
    knowledgeGraphs: Map<string, KnowledgeGraph>
  ): CytoscapeGraphData {
    console.log('[CytoscapeGraphModel] Building system graph with compound nodes');
    
    const nodes: CytoscapeNode[] = [];
    const edges: CytoscapeEdge[] = [];
    let edgeIdCounter = 0;

    // Process folders and notes with compound structure
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

      // Note: Parent-child relationships are now handled via compound nodes (parent property)
      // No need for explicit parent-child edges
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

    // Add entities as children of the note (compound structure)
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

    console.log('[CytoscapeGraphModel] Cytoscape instance initialized with compound node support');
    return this.cy;
  }

  /**
   * HIGH-PERFORMANCE: Adds a collection of nodes and edges to the graph using batch operations
   */
  public addElements(elements: ElementDefinition[]): void {
    if (!this.cy) {
      console.warn('[CytoscapeGraphModel] Cannot add elements, Cytoscape not initialized.');
      return;
    }

    this.cy.batch(() => {
      this.cy!.add(elements);
    });

    console.log(`[CytoscapeGraphModel] Batched addition of ${elements.length} elements.`);
  }

  /**
   * CRUD - UPDATE: Moves a node to a new parent (e.g., moving a note to another folder)
   */
  public moveNode(nodeId: string, newParentId: string | null): void {
    if (!this.cy) return;

    const node = this.cy.getElementById(nodeId);
    if (node.empty()) {
      console.warn(`[CytoscapeGraphModel] Move failed: Node with ID ${nodeId} not found.`);
      return;
    }

    // ele.move() is the specific API for changing a node's parent in a compound hierarchy
    node.move({ parent: newParentId });
    console.log(`[CytoscapeGraphModel] Moved node ${nodeId} to parent ${newParentId}.`);
  }

  /**
   * CRUD - DELETE: Removes a node and all its descendants from the graph
   */
  public deleteNodeAndDescendants(nodeId: string): void {
    if (!this.cy) return;

    const node = this.cy.getElementById(nodeId);
    if (node.empty()) return;

    // The cy.remove() command on a parent node automatically removes all its descendants
    const removedElements = this.cy.remove(node);
    console.log(`[CytoscapeGraphModel] Removed ${removedElements.length} elements (node and its descendants).`);
  }

  /**
   * CRUD - READ: Extracts a complete subgraph for a given parent node and its descendants
   */
  public getSubgraphFor(parentId: string): { nodes: any[], edges: any[] } | null {
    if (!this.cy) return null;

    const parentNode = this.cy.getElementById(parentId);
    if (parentNode.empty()) return null;

    // Get the parent and all its descendants, and all edges connecting them
    const subgraphElements = parentNode.descendants().add(parentNode).edgesWith(parentNode.descendants());

    // Use the .jsons() utility to get clean, serializable data objects
    const jsons = subgraphElements.jsons();
    const nodes = jsons.filter((item: any) => item.data.source === undefined && item.data.target === undefined);
    const edges = jsons.filter((item: any) => item.data.source !== undefined && item.data.target !== undefined);
    return { nodes, edges };
  }

  /**
   * ADVANCED QUERYING: Finds all 'note' nodes within a specific folder that have a high PageRank score
   */
  public findInfluentialNotesInFolder(folderId: string, minPageRank: number = 0.2): string[] {
    if (!this.cy) return [];

    // This selector is executed efficiently in the core engine
    const influentialNodes = this.cy.nodes(`
      node[type = "note"]
      [parent = "${folderId}"]
      [pageRank >= ${minPageRank}]
    `);
    
    return influentialNodes.map(node => node.id());
  }

  /**
   * Perform advanced graph analysis with sophisticated centrality algorithms
   */
  public analyzeGraph(): GraphAnalysis | null {
    if (!this.cy) {
      console.warn('[CytoscapeGraphModel] Cytoscape not initialized');
      return null;
    }

    console.log('[CytoscapeGraphModel] Performing advanced graph analysis');

    // Advanced Centrality Analysis
    const pageRank = this.cy.elements().pageRank({ dampingFactor: 0.85 });
    const betweenness = this.cy.elements().betweennessCentrality({ directed: false });
    
    // Fix: Closeness centrality returns the value directly for each node
    const centralNodes: AdvancedCentralityMetrics[] = this.cy.nodes().map(node => {
      // Compute closeness centrality for this specific node as root
      const closenessResult = this.cy!.elements().closenessCentrality({ root: node, directed: false });
      
      return {
        id: node.id(),
        degree: node.degree(false),
        pageRank: pageRank.rank(node),
        betweenness: betweenness.betweenness(node),
        closeness: closenessResult // closenessResult is the number directly
      };
    })
    .sort((a, b) => b.pageRank - a.pageRank); // Sort by influence (PageRank)

    // Enhanced clustering - fallback to type-based if community detection not available
    const clusters = this.detectCommunities();

    // Analyze hierarchical structure using compound nodes
    const hierarchicalStructure = this.analyzeHierarchicalStructure();

    console.log(`[CytoscapeGraphModel] Analysis complete: ${centralNodes.length} nodes analyzed, ${clusters.length} communities detected`);

    return {
      centralNodes: centralNodes.slice(0, 20), // Top 20 most influential nodes
      clusters,
      pathsBetween: (source: string, target: string) => {
        if (!this.cy) return [];
        const dijkstra = this.cy.elements().dijkstra({ root: this.cy.$(`#${source}`) });
        const path = dijkstra.pathTo(this.cy.$(`#${target}`));
        return path.nodes().map(node => node.id());
      },
      subgraph: (nodeIds: string[]) => this.extractSubgraph(nodeIds),
      hierarchicalStructure
    };
  }

  /**
   * Detect communities using available algorithms or fallback to type-based clustering
   */
  private detectCommunities(): Array<{ id: string; nodes: string[]; modularity?: number }> {
    if (!this.cy) return [];

    // Note: This is prepared for community detection extensions like cytoscape-louvain
    // For now, we'll use an enhanced type-based approach with structural considerations
    
    const typeGroups: Record<string, string[]> = {};
    
    this.cy.nodes().forEach(node => {
      const type = node.data('type');
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      typeGroups[type].push(node.id());
    });

    // Enhance with structural clustering - group nodes that are highly interconnected
    const structuralClusters = this.findStructuralClusters();

    const combinedClusters = [
      ...Object.entries(typeGroups).map(([type, nodes]) => ({
        id: `type-${type}`,
        nodes
      })),
      ...structuralClusters
    ];

    return combinedClusters;
  }

  /**
   * Find structural clusters based on edge density
   */
  private findStructuralClusters(): Array<{ id: string; nodes: string[] }> {
    if (!this.cy) return [];

    const clusters: Array<{ id: string; nodes: string[] }> = [];
    const visited = new Set<string>();

    this.cy.nodes().forEach(node => {
      if (visited.has(node.id())) return;

      const cluster = this.expandCluster(node, visited);
      if (cluster.length > 2) { // Only include clusters with more than 2 nodes
        clusters.push({
          id: `structural-${clusters.length}`,
          nodes: cluster
        });
      }
    });

    return clusters;
  }

  /**
   * Expand cluster using local density
   */
  private expandCluster(startNode: any, visited: Set<string>): string[] {
    const cluster = [startNode.id()];
    visited.add(startNode.id());

    const neighbors = startNode.neighborhood().nodes();
    
    neighbors.forEach((neighbor: any) => {
      if (!visited.has(neighbor.id())) {
        const commonNeighbors = startNode.neighborhood().intersection(neighbor.neighborhood()).nodes().length;
        const totalNeighbors = Math.max(startNode.degree(false), neighbor.degree(false));
        
        // Include in cluster if they share significant common neighbors
        if (commonNeighbors / totalNeighbors > 0.3) {
          cluster.push(neighbor.id());
          visited.add(neighbor.id());
        }
      }
    });

    return cluster;
  }

  /**
   * Analyze hierarchical structure using compound nodes
   */
  private analyzeHierarchicalStructure(): {
    rootNodes: string[];
    maxDepth: number;
    compoundRelations: Array<{ parent: string; children: string[] }>;
  } {
    if (!this.cy) {
      return { rootNodes: [], maxDepth: 0, compoundRelations: [] };
    }

    const rootNodes: string[] = [];
    const compoundRelations: Array<{ parent: string; children: string[] }> = [];
    let maxDepth = 0;

    this.cy.nodes().forEach(node => {
      if (node.isOrphan()) {
        rootNodes.push(node.id());
      }

      if (node.isParent()) {
        const children = node.children().map(child => child.id());
        compoundRelations.push({
          parent: node.id(),
          children
        });

        // Calculate depth
        const depth = this.calculateNodeDepth(node);
        maxDepth = Math.max(maxDepth, depth);
      }
    });

    return {
      rootNodes,
      maxDepth,
      compoundRelations
    };
  }

  /**
   * Calculate the depth of a node in the compound hierarchy
   */
  private calculateNodeDepth(node: any): number {
    let depth = 0;
    let current = node;

    while (!current.isOrphan()) {
      current = current.parent();
      depth++;
    }

    return depth;
  }

  /**
   * UPGRADED: Export graph as JSON file using the built-in serializer
   */
  public exportGraphJSON(noteId?: string): string {
    const filename = noteId 
      ? `knowledge-graph-${noteId}-${Date.now()}.json`
      : `system-graph-${Date.now()}.json`;

    if (!this.cy) {
      console.warn('[CytoscapeGraphModel] Cannot export, Cytoscape not initialized.');
      // Fallback to original data if cy instance is gone
      return JSON.stringify({ filename, graphData: this.graphData });
    }

    const exportData = {
      filename,
      generated: new Date().toISOString(),
      // cy.elements().jsons() exports clean, serializable element data
      cytoscapeFormat: {
        elements: this.cy.elements().jsons()
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
        parent: folder.parentId || undefined, // Compound node support
        properties: {
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
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
        parent: note.parentId || undefined, // Compound node support
        properties: {
          contentLength: note.content.length,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
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
        parent: noteId, // Entities are children of their containing note
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

  private extractSubgraph(nodeIds: string[]): CytoscapeGraphData {
    if (!this.cy || !this.graphData) {
      return { nodes: [], edges: [], metadata: { generated: '', noteCount: 0, folderCount: 0, entityCount: 0, relationshipCount: 0 } };
    }

    const selectedNodes = this.cy.nodes().filter(node => nodeIds.includes(node.id()));
    const connectedEdges = selectedNodes.connectedEdges();

    const nodes = this.graphData.nodes.filter(node => nodeIds.includes(node.data.id));
    
    // Get edge IDs from Cytoscape collection
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
