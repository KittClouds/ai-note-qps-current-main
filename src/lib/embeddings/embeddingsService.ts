import { GraphRAG, GraphNode, RankedNode } from './graphrag';
import { HNSWAdapter } from './hnswAdapter';
import { createNoteChunks, TextChunk, preprocessText } from './textProcessing';
import { createNoteChunksSemantic } from './textProcessing';
import { SemanticChunkingOptions } from './semanticChunkingConfig';
import { providerRegistry } from './providers/ProviderRegistry';
import { EmbeddingProvider } from './providers/EmbeddingProvider';

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

export interface SearchResult {
  noteId: string;
  title: string;
  content: string;
  score: number;
  graphScore?: number;
}

export interface IndexStatus {
  hasIndex: boolean;
  indexSize: number;
  needsRebuild: boolean;
  graphNodes: number;
  graphEdges: number;
}

export class EmbeddingsService {
  private graphRAG: GraphRAG;
  private hnswAdapter: HNSWAdapter;
  private isInitialized = false;
  private noteMetadata = new Map<string, { title: string; noteId: string }>();
  private currentProvider: EmbeddingProvider | null = null;

  constructor() {
    // Initialize with default dimensions - will be updated when provider is set
    this.graphRAG = new GraphRAG(384);
    this.hnswAdapter = new HNSWAdapter(384);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize provider registry
      await providerRegistry.initializeFromStorage();
      this.currentProvider = providerRegistry.getActiveProvider();
      
      if (!this.currentProvider) {
        throw new Error('No embedding provider available');
      }

      // Update dimensions based on active provider
      this.updateDimensions(this.currentProvider.dimension);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize embeddings service:', error);
      throw error;
    }
  }

  async switchProvider(providerId: string, apiKey?: string): Promise<void> {
    try {
      // Set API key for Gemini if provided
      if (providerId === 'gemini' && apiKey) {
        const geminiProvider = providerRegistry.getProvider('gemini') as any;
        if (geminiProvider && geminiProvider.setApiKey) {
          geminiProvider.setApiKey(apiKey);
        }
      }

      await providerRegistry.setActiveProvider(providerId);
      this.currentProvider = providerRegistry.getActiveProvider();
      
      if (this.currentProvider) {
        this.updateDimensions(this.currentProvider.dimension);
        console.log(`Switched to ${this.currentProvider.name} (${this.currentProvider.dimension}D)`);
      }
    } catch (error) {
      console.error('Failed to switch provider:', error);
      throw error;
    }
  }

  private updateDimensions(dimension: number): void {
    // Clear existing data when switching dimensions
    this.clear();
    
    // Recreate components with new dimensions
    this.graphRAG = new GraphRAG(dimension);
    this.hnswAdapter = new HNSWAdapter(dimension);
  }

  getCurrentProvider(): EmbeddingProvider | null {
    return this.currentProvider;
  }

  private async generateEmbeddings(text: string | string[], isQuery = false): Promise<number[][]> {
    if (!this.currentProvider) {
      throw new Error('No embedding provider initialized');
    }

    const texts = Array.isArray(text) ? text : [text];
    return await this.currentProvider.generateEmbeddings(texts, { isQuery });
  }

  /**
   * Add a note to the knowledge graph with enhanced chunking options
   */
  async addNote(
    noteId: string, 
    title: string, 
    content: string,
    chunkingMethod: 'semantic' | 'basic' | 'sentences' | 'original' = 'original',
    semanticOptions: SemanticChunkingOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      let chunks: TextChunk[];
      
      // Use semantic chunking if requested
      if (chunkingMethod !== 'original') {
        chunks = await createNoteChunksSemantic(
          noteId, 
          title, 
          content, 
          chunkingMethod,
          {
            maxTokenSize: 500,
            similarityThreshold: 0.7,
            combineChunks: true,
            logging: false,
            ...semanticOptions
          }
        );
      } else {
        // Use original chunking method
        chunks = createNoteChunks(noteId, title, content);
      }
      
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
            originalNoteId: noteId,
            title: title,
            chunkingMethod
          }
        };
        
        this.graphRAG.addNode(node);
        this.noteMetadata.set(nodeId, { title, noteId });
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

      console.log(`Added note ${noteId} with ${chunks.length} chunks using ${chunkingMethod} chunking to knowledge graph`);
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
  async search(query: string, topK: number = 10): Promise<SearchResult[]> {
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

      // Convert to SearchResult format
      return results.map(result => {
        const metadata = this.noteMetadata.get(result.id);
        return {
          noteId: result.metadata?.originalNoteId || result.id,
          title: metadata?.title || result.metadata?.title || 'Untitled',
          content: result.content,
          score: result.score
        };
      });
    } catch (error) {
      console.error('Semantic search failed:', error);
      throw error;
    }
  }

  /**
   * Sync all notes with enhanced chunking options
   */
  async syncAllNotes(
    notes: Array<{ id: string; title: string; content: string }>,
    chunkingMethod: 'semantic' | 'basic' | 'sentences' | 'original' = 'original',
    semanticOptions: SemanticChunkingOptions = {}
  ): Promise<number> {
    let syncedCount = 0;
    
    for (const note of notes) {
      try {
        await this.addNote(note.id, note.title, note.content, chunkingMethod, semanticOptions);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync note ${note.id}:`, error);
      }
    }
    
    return syncedCount;
  }

  /**
   * Get the current index status
   */
  getIndexStatus(): IndexStatus {
    const nodes = this.graphRAG.getNodes();
    const edges = this.graphRAG.getEdges();
    
    return {
      hasIndex: nodes.length > 0,
      indexSize: nodes.length,
      needsRebuild: false,
      graphNodes: nodes.length,
      graphEdges: edges.length
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
    if (this.currentProvider) {
      this.currentProvider.dispose();
    }
    this.clear();
    this.isInitialized = false;
  }
}

// Create a singleton instance
export const embeddingsService = new EmbeddingsService();
