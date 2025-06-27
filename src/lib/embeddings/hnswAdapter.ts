
import { HNSW } from './HNSW';
import { SimilarityIndex } from './graphrag';

/**
 * Adapter to make the existing HNSW implementation compatible with GraphRAG's SimilarityIndex interface
 */
export class HNSWAdapter implements SimilarityIndex {
  private hnsw: HNSW;
  private nodeIdMap: Map<string, number> = new Map(); // Maps string IDs to numeric IDs
  private reverseNodeIdMap: Map<number, string> = new Map(); // Maps numeric IDs back to string IDs
  private nextNodeId = 0;

  constructor(dimension: number = 384, M: number = 16, efConstruction: number = 200) {
    this.hnsw = new HNSW(M, efConstruction, 'cosine');
  }

  addItems(items: Array<{ id: string; embedding: number[] }>): void {
    for (const item of items) {
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
        // Handle case where point already exists by updating it
        if (error.message.includes('already exists')) {
          console.warn(`Point ${item.id} (${numericId}) already exists in HNSW, skipping...`);
        } else {
          throw error;
        }
      }
    }
  }

  search(queryEmbedding: number[], k: number): Array<{ id: string; distance: number }> {
    if (this.hnsw.nodes.size === 0) {
      return [];
    }

    try {
      const results = this.hnsw.searchKNN(new Float32Array(queryEmbedding), k);
      
      return results.map(result => ({
        id: this.reverseNodeIdMap.get(result.id)!,
        distance: 1 - result.score // Convert similarity back to distance (GraphRAG expects distance)
      })).filter(result => result.id !== undefined);
    } catch (error) {
      console.error('HNSW search failed:', error);
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
}
