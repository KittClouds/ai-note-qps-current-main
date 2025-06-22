
import { GraphRAG, GraphNode, RankedNode } from './graphrag';
import { HNSWAdapter } from './hnswAdapter';
import { createNoteChunks, TextChunk, preprocessText } from './textProcessing';

export interface EmbeddingWorkerMessage {
  source: string;
  text?: string | string[];
  isQuery?: boolean;
}

export interface EmbeddingWorkerResponse {
  status: 'complete' | 'error' | 'progress';
  embeddings?: number[][];
  error?: string;
}

export class EmbeddingsService {
  private worker: Worker | null = null;
  private graphRAG: GraphRAG;
  private hnswAdapter: HNSWAdapter;
  private isInitialized = false;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  private requestId = 0;

  constructor() {
    this.graphRAG = new GraphRAG(384); // 384-dimensional embeddings
    this.hnswAdapter = new HNSWAdapter(384);
  }

  /**
   * Initialize the embeddings service and worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create the worker
      this.worker = new Worker(
        new URL('./embeddingsWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up worker message handling
      this.worker.onmessage = (event) => {
        const { status, embeddings, error } = event.data;
        
        if (status === 'complete' || status === 'error') {
          // Handle responses to specific requests
          const requestKey = `${this.requestId - 1}`;
          const pendingRequest = this.pendingRequests.get(requestKey);
          
          if (pendingRequest) {
            if (status === 'complete') {
              pendingRequest.resolve(embeddings);
            } else {
              pendingRequest.reject(new Error(error));
            }
            this.pendingRequests.delete(requestKey);
          }
        } else {
          // Handle progress updates
          console.log('Embeddings model loading progress:', event.data);
        }
      };

      this.worker.onerror = (error) => {
        console.error('Embeddings worker error:', error);
      };

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize embeddings service:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text using the worker
   */
  private async generateEmbeddings(text: string | string[], isQuery = false): Promise<number[][]> {
    if (!this.worker) {
      throw new Error('Embeddings service not initialized');
    }

    const requestKey = `${this.requestId++}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestKey, { resolve, reject });
      
      this.worker!.postMessage({
        source: Array.isArray(text) ? text.join(' ') : text,
        text: text,
        isQuery
      });
    });
  }

  /**
   * Add a note to the knowledge graph
   */
  async addNote(noteId: string, title: string, content: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Create chunks from the note
      const chunks = createNoteChunks(noteId, title, content);
      
      if (chunks.length === 0) {
        console.warn(`No chunks created for note ${noteId}`);
        return;
      }

      // Generate embeddings for all chunks
      const chunkTexts = chunks.map(chunk => chunk.text);
      const embeddings = await this.generateEmbeddings(chunkTexts);

      // Add nodes to GraphRAG
      chunks.forEach((chunk, index) => {
        const nodeId = `${noteId}_chunk_${index}`;
        const node: GraphNode = {
          id: nodeId,
          content: chunk.text,
          embedding: embeddings[index],
          metadata: {
            ...chunk.metadata,
            originalNoteId: noteId
          }
        };
        
        this.graphRAG.addNode(node);
      });

      // Build sequential edges for chunks from the same note
      if (chunks.length > 1) {
        this.graphRAG.buildSequentialEdges({ metadataKey: 'chunkIndex' });
      }

      // Rebuild semantic edges with HNSW acceleration
      this.graphRAG.buildSemanticEdges({ 
        threshold: 0.7, 
        index: this.hnswAdapter,
        k: 10 
      });

      console.log(`Added note ${noteId} with ${chunks.length} chunks to knowledge graph`);
    } catch (error) {
      console.error(`Failed to add note ${noteId} to embeddings:`, error);
      throw error;
    }
  }

  /**
   * Remove a note from the knowledge graph
   */
  removeNote(noteId: string): void {
    const nodes = this.graphRAG.getNodes();
    const nodesToRemove = nodes.filter(node =>
      node.metadata?.originalNoteId === noteId
    );

    // Clear and rebuild the graph without the removed note
    // This is a simple approach; more sophisticated implementations
    // might selectively remove nodes and edges
    if (nodesToRemove.length > 0) {
      const remainingNodes = nodes.filter(node =>
        node.metadata?.originalNoteId !== noteId
      );

      // Rebuild the graph
      this.graphRAG.clear();
      this.hnswAdapter.clear();

      // Re-add remaining nodes
      remainingNodes.forEach(node => {
        this.graphRAG.addNode(node);
      });

      // Rebuild edges
      this.graphRAG.buildSemanticEdges({ 
        threshold: 0.7, 
        index: this.hnswAdapter,
        k: 10 
      });
      this.graphRAG.buildSequentialEdges({ metadataKey: 'chunkIndex' });

      console.log(`Removed note ${noteId} from knowledge graph`);
    }
  }

  /**
   * Perform semantic search
   */
  async search(query: string, topK: number = 10): Promise<RankedNode[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const processedQuery = preprocessText(query);
      const queryEmbeddings = await this.generateEmbeddings(processedQuery, true);
      const queryEmbedding = queryEmbeddings[0];

      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      const results = this.graphRAG.query({
        queryEmbedding,
        topK,
        randomWalkSteps: 100,
        restartProb: 0.15,
        walkEdgeType: 'semantic'
      });

      return results;
    } catch (error) {
      console.error('Semantic search failed:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the knowledge graph
   */
  getStats(): { nodeCount: number; edgeCount: number; hnswStats: any } {
    return {
      nodeCount: this.graphRAG.getNodes().length,
      edgeCount: this.graphRAG.getEdges().length,
      hnswStats: this.hnswAdapter.getStats()
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.graphRAG.clear();
    this.hnswAdapter.clear();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.clear();
    this.isInitialized = false;
  }
}

// Create a singleton instance
export const embeddingsService = new EmbeddingsService();
