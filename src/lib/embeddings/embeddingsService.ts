
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
  private graphRAG: GraphRAG | null = null;
  private hnswAdapter: HNSWAdapter | null = null;
  private isInitialized = false;
  private noteMetadata = new Map<string, { title: string; noteId: string }>();
  private currentProvider: EmbeddingProvider | null = null;
  private currentDimension: number | null = null;

  constructor() {
    // Don't initialize components here - wait for provider initialization
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[EmbeddingsService] Initializing...');
      
      // Initialize provider registry first
      await providerRegistry.initializeFromStorage();
      this.currentProvider = providerRegistry.getActiveProvider();
      
      if (!this.currentProvider) {
        throw new Error('No embedding provider available');
      }

      console.log(`[EmbeddingsService] Active provider: ${this.currentProvider.name} (${this.currentProvider.dimension}D)`);

      // Initialize components with provider's dimensions
      await this.initializeComponents(this.currentProvider.dimension);
      
      this.isInitialized = true;
      console.log('[EmbeddingsService] Initialization complete');
    } catch (error) {
      console.error('Failed to initialize embeddings service:', error);
      throw error;
    }
  }

  private async initializeComponents(dimension: number): Promise<void> {
    if (!dimension || dimension <= 0) {
      throw new Error('Invalid dimension for component initialization');
    }

    console.log(`[EmbeddingsService] Initializing components with ${dimension}D`);
    
    // Update dimension tracking
    this.currentDimension = dimension;
    
    // Initialize or recreate components with correct dimensions
    this.graphRAG = new GraphRAG(dimension);
    this.hnswAdapter = new HNSWAdapter(dimension);
    
    console.log(`[EmbeddingsService] Components initialized with ${dimension}D`);
  }

  async switchProvider(providerId: string, apiKey?: string): Promise<void> {
    try {
      console.log(`[EmbeddingsService] Switching to provider: ${providerId}`);
      
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
        console.log(`[EmbeddingsService] Provider switched to ${this.currentProvider.name} (${this.currentProvider.dimension}D)`);
        
        // Reinitialize components with new provider's dimensions
        await this.initializeComponents(this.currentProvider.dimension);
      }
    } catch (error) {
      console.error('Failed to switch provider:', error);
      throw error;
    }
  }

  getCurrentProvider(): EmbeddingProvider | null {
    return this.currentProvider;
  }

  private async generateEmbeddings(text: string | string[], isQuery = false): Promise<number[][]> {
    if (!this.currentProvider) {
      throw new Error('No embedding provider initialized');
    }

    if (!this.currentDimension) {
      throw new Error('Dimension not set - service not properly initialized');
    }

    const texts = Array.isArray(text) ? text : [text];
    console.log(`[EmbeddingsService] Generating embeddings for ${texts.length} texts using ${this.currentProvider.name} (${this.currentProvider.dimension}D)`);
    
    const embeddings = await this.currentProvider.generateEmbeddings(texts, { isQuery });
    
    // Validate embedding dimensions
    if (embeddings.length > 0 && embeddings[0].length !== this.currentDimension) {
      throw new Error(`Embedding dimension mismatch: expected ${this.currentDimension}, got ${embeddings[0].length}`);
    }
    
    console.log(`[EmbeddingsService] Generated ${embeddings.length} embeddings of ${embeddings[0]?.length || 0} dimensions`);
    return embeddings;
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

    if (!this.graphRAG || !this.hnswAdapter) {
      throw new Error('Components not initialized');
    }

    try {
      console.log(`[EmbeddingsService] Adding note ${noteId} using ${chunkingMethod} chunking`);
      
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

      console.log(`[EmbeddingsService] Processing ${chunks.length} chunks for note ${noteId}`);

      // Add nodes to GraphRAG
      chunks.forEach((chunk, index) => {
        const nodeId = `${noteId}_chunk_${index}`;
        const embedding = embeddings[index];
        
        // Validate embedding before adding
        if (!embedding || embedding.length !== this.currentDimension) {
          throw new Error(`Invalid embedding for chunk ${index}: expected ${this.currentDimension}D, got ${embedding?.length || 0}D`);
        }
        
        const node: GraphNode = {
          id: nodeId,
          content: chunk.text,
          embedding: embedding,
          metadata: {
            ...chunk.metadata,
            originalNoteId: noteId,
            title: title,
            chunkingMethod
          }
        };
        
        this.graphRAG!.addNode(node);
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

      console.log(`[EmbeddingsService] Successfully added note ${noteId} with ${chunks.length} chunks to knowledge graph`);
    } catch (error) {
      console.error(`Failed to add note ${noteId} to embeddings:`, error);
      throw error;
    }
  }

  /**
   * Remove a note from the knowledge graph
   */
  removeNote(noteId: string): void {
    const nodes = this.graphRAG!.getNodes();
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
      this.graphRAG!.clear();
      this.hnswAdapter!.clear();

      // Re-add remaining nodes
      remainingNodes.forEach(node => {
        this.graphRAG!.addNode(node);
      });

      // Rebuild edges
      this.graphRAG!.buildSemanticEdges({ 
        threshold: 0.7, 
        index: this.hnswAdapter!,
        k: 10 
      });
      this.graphRAG!.buildSequentialEdges({ metadataKey: 'chunkIndex' });

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

    if (!this.graphRAG) {
      throw new Error('GraphRAG not initialized');
    }

    try {
      console.log(`[EmbeddingsService] Searching for: "${query}" (top ${topK})`);
      
      const processedQuery = preprocessText(query);
      const queryEmbeddings = await this.generateEmbeddings(processedQuery, true);
      const queryEmbedding = queryEmbeddings[0];

      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      if (queryEmbedding.length !== this.currentDimension) {
        throw new Error(`Query embedding dimension mismatch: expected ${this.currentDimension}, got ${queryEmbedding.length}`);
      }

      const results = this.graphRAG.query({
        queryEmbedding,
        topK,
        randomWalkSteps: 100,
        restartProb: 0.15,
        walkEdgeType: 'semantic'
      });

      // Convert to SearchResult format
      const searchResults = results.map(result => {
        const metadata = this.noteMetadata.get(result.id);
        return {
          noteId: result.metadata?.originalNoteId || result.id,
          title: metadata?.title || result.metadata?.title || 'Untitled',
          content: result.content,
          score: result.score
        };
      });

      console.log(`[EmbeddingsService] Found ${searchResults.length} results`);
      return searchResults;
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

  getIndexStatus(): IndexStatus {
    // Handle case when components aren't initialized yet
    if (!this.graphRAG || !this.hnswAdapter) {
      return {
        hasIndex: false,
        indexSize: 0,
        needsRebuild: false,
        graphNodes: 0,
        graphEdges: 0
      };
    }

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

  clear(): void {
    if (this.graphRAG) {
      this.graphRAG.clear();
    }
    if (this.hnswAdapter) {
      this.hnswAdapter.clear();
    }
  }

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
