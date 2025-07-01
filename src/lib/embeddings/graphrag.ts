
// --- Core Graph Types ---

export interface EdgeTypeDefinition {
  /** If true, creating an edge from A to B automatically creates an edge from B to A. */
  symmetrical?: boolean;
}

export interface GraphNode {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface RankedNode extends GraphNode {
  score: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
}

export interface GraphChunk {
  text: string;
  metadata: Record<string, any>;
}

export interface GraphEmbedding {
  vector: number[];
}

/**
 * An interface for a pluggable similarity index (e.g., HNSW, FAISS)
 * to accelerate finding nearest neighbors and avoid O(n^2) comparisons.
 */
export interface SimilarityIndex {
  addItems(items: Array<{ id: string; embedding: number[] }>): void;
  search(queryEmbedding: number[], k: number): Array<{ id: string; distance: number }>;
}

export class GraphRAG {
  private nodes: Map<string, GraphNode>;
  private edges: GraphEdge[];
  private dimension: number;
  private edgeTypeDefinitions: Map<string, EdgeTypeDefinition>;

  constructor(dimension: number) {
    if (!dimension || dimension <= 0) {
      throw new Error('GraphRAG dimension must be a positive number');
    }
    
    this.nodes = new Map();
    this.edges = [];
    this.dimension = dimension;
    this.edgeTypeDefinitions = new Map();

    // Register a default 'semantic' edge type
    this.defineEdgeType('semantic', { symmetrical: true });

    console.log(`[GraphRAG] Initialized with ${dimension}D`);
  }

  // Add method to update dimensions
  updateDimension(newDimension: number): void {
    if (!newDimension || newDimension <= 0) {
      throw new Error('GraphRAG dimension must be a positive number');
    }
    
    if (this.nodes.size > 0) {
      console.warn(`[GraphRAG] Updating dimension on non-empty graph from ${this.dimension}D to ${newDimension}D. Existing embeddings may be incompatible.`);
    }
    this.dimension = newDimension;
    console.log(`[GraphRAG] Dimension updated to ${newDimension}D`);
  }

  getDimension(): number {
    return this.dimension;
  }

  // --- 1. Edge-Type Registry ---

  /**
   * Defines a new type of edge and its behavior.
   * @param name The name of the edge type (e.g., 'hierarchical', 'sequential').
   * @param definition The properties of this edge type.
   */
  defineEdgeType(name: string, definition: EdgeTypeDefinition): void {
    if (this.edgeTypeDefinitions.has(name)) {
      console.warn(`Edge type "${name}" is being redefined.`);
    }
    this.edgeTypeDefinitions.set(name, definition);
  }

  // --- Core Graph Operations ---

  // Add a node to the graph
  addNode(node: GraphNode): void {
    if (node.embedding && node.embedding.length !== this.dimension) {
      throw new Error(`Embedding dimension must be ${this.dimension}, got ${node.embedding.length}`);
    }
    this.nodes.set(node.id, node);
  }

  // Add an edge between two nodes, respecting the type definition
  addEdge(edge: GraphEdge): void {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      throw new Error('Both source and target nodes must exist');
    }
    if (!this.edgeTypeDefinitions.has(edge.type)) {
      throw new Error(`Edge type "${edge.type}" is not defined. Use defineEdgeType first.`);
    }

    this.edges.push(edge);

    // Add reverse edge if the type is symmetrical
    const definition = this.edgeTypeDefinitions.get(edge.type);
    if (definition?.symmetrical) {
      this.edges.push({
        source: edge.target,
        target: edge.source,
        weight: edge.weight,
        type: edge.type,
      });
    }
  }

  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): GraphEdge[] {
    return this.edges;
  }

  clear(): void {
    this.nodes.clear();
    this.edges = [];
  }

  // --- 2. Metadata-driven Auto-edges ---

  /**
   * Builds semantic similarity edges. Can use a pluggable index for performance.
   * @param options Configuration for building edges.
   * @param options.threshold Minimum similarity to create an edge.
   * @param options.index Optional pre-built similarity index for faster neighbor search.
   * @param options.k If using an index, the number of neighbors to consider for each node.
   */
  buildSemanticEdges({ threshold = 0.7, index, k = 5 }: { threshold?: number; index?: SimilarityIndex; k?: number }): void {
    const nodesWithEmbeddings = Array.from(this.nodes.values()).filter(n => n.embedding);

    if (index) {
        // O(N*K*log(N)) or better: Use the provided similarity index
        index.addItems(nodesWithEmbeddings.map(n => ({ id: n.id, embedding: n.embedding! })));
        for (const node of nodesWithEmbeddings) {
            const neighbors = index.search(node.embedding!, k);
            for (const neighbor of neighbors) {
                // Ensure we don't connect a node to itself and respect threshold
                if (node.id !== neighbor.id && (1 - neighbor.distance) > threshold) {
                    this.addEdge({ source: node.id, target: neighbor.id, weight: 1 - neighbor.distance, type: 'semantic' });
                }
            }
        }
    } else {
        // O(N^2): Fallback to pairwise comparison
        for (let i = 0; i < nodesWithEmbeddings.length; i++) {
            for (let j = i + 1; j < nodesWithEmbeddings.length; j++) {
                const node1 = nodesWithEmbeddings[i]!;
                const node2 = nodesWithEmbeddings[j]!;
                const similarity = this.cosineSimilarity(node1.embedding!, node2.embedding!);
                if (similarity > threshold) {
                    this.addEdge({ source: node1.id, target: node2.id, weight: similarity, type: 'semantic' });
                }
            }
        }
    }
  }

  /**
   * Creates sequential edges based on a timestamp or order key in metadata.
   * @param options Configuration for building sequential edges.
   * @param options.metadataKey The metadata key to sort by (e.g., 'timestamp', 'page_number').
   */
  buildSequentialEdges({ metadataKey }: { metadataKey: string }): void {
    this.defineEdgeType('sequential', { symmetrical: false });
    const sortedNodes = Array.from(this.nodes.values())
      .filter(n => n.metadata && n.metadata[metadataKey] !== undefined)
      .sort((a, b) => a.metadata![metadataKey] - b.metadata![metadataKey]);

    for (let i = 0; i < sortedNodes.length - 1; i++) {
      const sourceNode = sortedNodes[i]!;
      const targetNode = sortedNodes[i + 1]!;
      this.addEdge({ source: sourceNode.id, target: targetNode.id, weight: 1.0, type: 'sequential' });
    }
  }

  /**
   * Creates hierarchical edges based on parent-child relationships in metadata.
   * @param options Configuration for building hierarchical edges.
   * @param options.parentIdKey The metadata key for the parent's ID.
   */
  buildHierarchicalEdges({ parentIdKey }: { parentIdKey: string }): void {
    this.defineEdgeType('hierarchical', { symmetrical: false });
    for (const node of this.nodes.values()) {
        const parentId = node.metadata?.[parentIdKey];
        if (parentId && this.nodes.has(parentId)) {
            this.addEdge({ source: parentId, target: node.id, weight: 1.0, type: 'hierarchical' });
        }
    }
  }

  // --- 3. Typed Traversal Shortcuts ---

  /**
   * Gets neighbors of a node, with options for direction and edge type.
   * @param nodeId The ID of the starting node.
   * @param options Filtering options for the traversal.
   * @returns An array of neighboring nodes with connection weight.
   */
  getNeighbors(nodeId: string, options: { edgeType?: string; direction?: 'in' | 'out' | 'both' } = {}): Array<{ id: string; weight: number }> {
    const { edgeType, direction = 'out' } = options;
    const neighbors = new Map<string, { id: string; weight: number }>();

    for(const edge of this.edges) {
        if (edgeType && edge.type !== edgeType) continue;

        if (direction === 'out' || direction === 'both') {
            if (edge.source === nodeId && !neighbors.has(edge.target)) {
                neighbors.set(edge.target, { id: edge.target, weight: edge.weight });
            }
        }
        if (direction === 'in' || direction === 'both') {
            if (edge.target === nodeId && !neighbors.has(edge.source)) {
                neighbors.set(edge.source, { id: edge.source, weight: edge.weight });
            }
        }
    }
    return Array.from(neighbors.values());
  }

  /**
   * Traverses up a hierarchy to find parent nodes.
   * @param nodeId The ID of the starting node.
   * @param hierarchyType The type of edge defining the hierarchy.
   */
  getParents(nodeId: string, hierarchyType: string = 'hierarchical'): Array<{ id: string; weight: number }> {
    return this.getNeighbors(nodeId, { edgeType: hierarchyType, direction: 'in' });
  }

  /**
   * Traverses down a hierarchy to find child nodes.
   * @param nodeId The ID of the starting node.
   * @param hierarchyType The type of edge defining the hierarchy.
   */
  getChildren(nodeId: string, hierarchyType: string = 'hierarchical'): Array<{ id: string; weight: number }> {
    return this.getNeighbors(nodeId, { edgeType: hierarchyType, direction: 'out' });
  }

  // --- Random-Walk Hybrid Retrieval ---

  /**
   * Performs a random walk with restart, now with typed edge support.
   */
  private randomWalkWithRestart(
    startNodeId: string,
    steps: number,
    restartProb: number,
    edgeType?: string
  ): Map<string, number> {
    const visits = new Map<string, number>();
    let currentNodeId = startNodeId;

    for (let step = 0; step < steps; step++) {
      visits.set(currentNodeId, (visits.get(currentNodeId) || 0) + 1);

      if (Math.random() < restartProb) {
        currentNodeId = startNodeId;
        continue;
      }
      const neighbors = this.getNeighbors(currentNodeId, { edgeType, direction: 'out' });
      if (neighbors.length === 0) {
        currentNodeId = startNodeId;
        continue;
      }

      currentNodeId = this.selectWeightedNeighbor(neighbors);
    }

    // Normalize visit counts to get a score distribution
    const totalVisits = Array.from(visits.values()).reduce((a, b) => a + b, 0);
    for (const [nodeId, count] of visits) {
      visits.set(nodeId, count / totalVisits);
    }
    return visits;
  }

  /**
   * Retrieves relevant nodes using a flexible hybrid approach.
   * It can start from a semantic query (embedding) or a predefined set of nodes.
   */
  query({
    queryEmbedding,
    seedNodeIds,
    topK = 10,
    randomWalkSteps = 100,
    restartProb = 0.15,
    walkEdgeType = 'semantic',
  }: {
    queryEmbedding?: number[];
    seedNodeIds?: string[];
    topK?: number;
    randomWalkSteps?: number;
    restartProb?: number;
    walkEdgeType?: string;
  }): RankedNode[] {
    if (!queryEmbedding && !seedNodeIds) {
      throw new Error('Must provide either a queryEmbedding or a set of seedNodeIds.');
    }

    let initialScores: Map<string, number>;

    if (queryEmbedding) {
      if (queryEmbedding.length !== this.dimension) {
        throw new Error(`Query embedding must have dimension ${this.dimension}, got ${queryEmbedding.length}`);
      }
      // Find initial candidate set via dense search
      const candidateScores: Array<[string, number]> = Array.from(this.nodes.values())
        .filter(n => n.embedding)
        .map(node => [node.id, this.cosineSimilarity(queryEmbedding, node.embedding!)] as [string, number])
        .sort((a, b) => b[1] - a[1])
        .slice(0, topK * 2);
      
      initialScores = new Map(candidateScores);
    } else {
      // Use provided seed nodes with a uniform initial score
      initialScores = new Map(seedNodeIds!.map(id => [id, 1.0] as [string, number]));
    }

    // Re-rank nodes using random walk
    const rerankedScores = new Map<string, number>();

    // For each node in the initial set, perform a random walk
    for (const [nodeId, initialScore] of initialScores) {
      const walkScores = this.randomWalkWithRestart(nodeId, randomWalkSteps, restartProb, walkEdgeType);

      // Combine the initial (semantic) score with the graph (walk) score
      for (const [walkedNodeId, walkScore] of walkScores) {
        const currentScore = rerankedScores.get(walkedNodeId) || 0;
        rerankedScores.set(walkedNodeId, currentScore + initialScore * walkScore);
      }
    }

    // Format and return the top K results
    return Array.from(rerankedScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([id, score]) => ({
        ...this.nodes.get(id)!,
        score,
      }));
  }

  // --- Helper Methods ---

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let normVec1 = 0;
    let normVec2 = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      normVec1 += vec1[i] * vec1[i];
      normVec2 += vec2[i] * vec2[i];
    }
    const magnitudeProduct = Math.sqrt(normVec1 * normVec2);
    return magnitudeProduct === 0 ? 0 : dotProduct / magnitudeProduct;
  }

  private selectWeightedNeighbor(neighbors: Array<{ id: string; weight: number }>): string {
    const totalWeight = neighbors.reduce((sum, n) => sum + n.weight, 0);
    let randomPoint = Math.random() * totalWeight;
    for (const neighbor of neighbors) {
      randomPoint -= neighbor.weight;
      if (randomPoint <= 0) {
        return neighbor.id;
      }
    }
    return neighbors[neighbors.length - 1]!.id;
  }
}
