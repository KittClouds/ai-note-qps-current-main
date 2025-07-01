
import { HNSW } from './HNSW';
import { SimilarityIndex } from './graphrag';
import { hnswPersistence } from './HNSW/persistence';

/**
 * Adapter to make the existing HNSW implementation compatible with GraphRAG's SimilarityIndex interface
 */
export class HNSWAdapter implements SimilarityIndex {
  private hnsw: HNSW;
  private nodeIdMap: Map<string, number> = new Map();
  private reverseNodeIdMap: Map<number, string> = new Map();
  private nextNodeId = 0;
  private dimension: number;

  constructor(dimension: number, M: number = 16, efConstruction: number = 200) {
    if (!dimension || dimension <= 0) {
      throw new Error('HNSWAdapter dimension must be a positive number');
    }
    
    this.dimension = dimension;
    this.hnsw = new HNSW(M, efConstruction, 'cosine');
    console.log(`[HNSWAdapter] Initialized with ${dimension}D`);
  }

  updateDimension(newDimension: number): void {
    if (!newDimension || newDimension <= 0) {
      throw new Error('HNSWAdapter dimension must be a positive number');
    }
    
    if (this.hnsw.nodes.size > 0) {
      console.warn(`[HNSWAdapter] Updating dimension on non-empty HNSW index from ${this.dimension}D to ${newDimension}D. Clearing existing data.`);
      this.clear();
    }
    this.dimension = newDimension;
    console.log(`[HNSWAdapter] Dimension updated to ${newDimension}D`);
  }

  getDimension(): number {
    return this.dimension;
  }

  addItems(items: Array<{ id: string; embedding: number[] }>): void {
    for (const item of items) {
      // Validate dimension
      if (item.embedding.length !== this.dimension) {
        console.warn(`[HNSWAdapter] Embedding dimension mismatch: expected ${this.dimension}, got ${item.embedding.length} for item ${item.id}`);
        continue;
      }

      // Convert string ID to numeric ID for HNSW
      let numericId = this.nodeIdMap.get(item.id);
      if (numericId === undefined) {
        numericId = this.nextNodeId++;
        this.nodeIdMap.set(item.id, numericId);
        this.reverseNodeIdMap.set(numericId, item.id);
      }

      try {
        this.hnsw.addPoint(numericId, new Float32Array(item.embedding));
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.warn(`[HNSWAdapter] Point ${item.id} (${numericId}) already exists in HNSW, skipping...`);
        } else {
          console.error(`[HNSWAdapter] Failed to add point ${item.id}:`, error);
          throw error;
        }
      }
    }
  }

  search(queryEmbedding: number[], k: number): Array<{ id: string; distance: number }> {
    if (this.hnsw.nodes.size === 0) {
      return [];
    }

    // Validate query embedding dimension
    if (queryEmbedding.length !== this.dimension) {
      console.warn(`[HNSWAdapter] Query embedding dimension mismatch: expected ${this.dimension}, got ${queryEmbedding.length}`);
      return [];
    }

    try {
      const results = this.hnsw.searchKNN(new Float32Array(queryEmbedding), k);
      
      return results.map(result => ({
        id: this.reverseNodeIdMap.get(result.id)!,
        distance: 1 - result.score // Convert similarity back to distance (GraphRAG expects distance)
      })).filter(result => result.id !== undefined);
    } catch (error) {
      console.error('[HNSWAdapter] Search failed:', error);
      return [];
    }
  }

  /**
   * Get the underlying HNSW instance for advanced operations
   */
  getHNSW(): HNSW {
    return this.hnsw;
  }

  /**
   * Clear all data from the index
   */
  clear(): void {
    this.hnsw.nodes.clear();
    this.hnsw.entryPointId = -1;
    this.nodeIdMap.clear();
    this.reverseNodeIdMap.clear();
    this.nextNodeId = 0;
  }

  /**
   * Get statistics about the index
   */
  getStats(): { nodeCount: number; dimension: number | null } {
    return {
      nodeCount: this.hnsw.nodes.size,
      dimension: this.hnsw.d
    };
  }

  /**
   * Save the current HNSW graph to persistent storage
   */
  async saveGraph(): Promise<void> {
    try {
      await hnswPersistence.persistGraph(this.hnsw);
      console.log(`[HNSWAdapter] Graph saved with ${this.hnsw.nodes.size} nodes`);
    } catch (error) {
      console.error('[HNSWAdapter] Failed to save graph:', error);
      throw error;
    }
  }

  /**
   * Load the latest HNSW graph from persistent storage
   */
  async loadGraph(): Promise<boolean> {
    try {
      const loadedGraph = await hnswPersistence.loadLatestGraph();
      if (loadedGraph) {
        this.hnsw = loadedGraph;
        console.log(`[HNSWAdapter] Graph loaded with ${this.hnsw.nodes.size} nodes`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[HNSWAdapter] Failed to load graph:', error);
      return false;
    }
  }

  /**
   * Set the store reference for persistence operations
   */
  setStore(store: any): void {
    hnswPersistence.setStore(store);
  }

  /**
   * Get snapshot information
   */
  async getSnapshotInfo(): Promise<{ count: number; latestDate?: Date; totalSize?: number }> {
    return await hnswPersistence.getSnapshotInfo();
  }

  /**
   * Clean up old snapshots
   */
  async cleanupOldSnapshots(keepLast = 2): Promise<number> {
    return await hnswPersistence.gcOldSnapshots(keepLast);
  }
}
