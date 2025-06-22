
import { HNSW } from './HNSW';
import { createEmbedding, initializeEmbeddingUtils } from './embeddingUtils';
import { DEFAULT_CONFIG } from './config';
import type { Note } from '@/types/notes';

export interface SearchResult {
  noteId: string;
  title: string;
  content: string;
  score: number;
}

class SemanticSearchService {
  private hnsw: HNSW | null = null;
  private noteMap: Map<number, Note> = new Map();
  private initialized = false;
  private currentNodeId = 0;

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize embedding utilities
      await initializeEmbeddingUtils(
        DEFAULT_CONFIG.ONNX_EMBEDDING_MODEL,
        DEFAULT_CONFIG.DTYPE
      );

      // Initialize HNSW index - using default parameters
      this.hnsw = new HNSW();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize semantic search:', error);
      throw error;
    }
  }

  async syncNote(note: Note): Promise<void> {
    await this.initialize();
    
    if (!this.hnsw) {
      throw new Error('HNSW index not initialized');
    }

    try {
      // Create embedding for the note content
      const text = `${note.title} ${note.content}`;
      const embedding = await createEmbedding(text);
      
      // Find existing node for this note
      let existingNodeId: number | null = null;
      for (const [nodeId, storedNote] of this.noteMap) {
        if (storedNote.id === note.id) {
          existingNodeId = nodeId;
          break;
        }
      }

      if (existingNodeId !== null) {
        // For updates, delete the old point and add a new one
        this.hnsw.deletePoint(existingNodeId);
        this.hnsw.addPoint(existingNodeId, embedding);
        this.noteMap.set(existingNodeId, note);
      } else {
        // Add new point
        const nodeId = this.currentNodeId++;
        this.hnsw.addPoint(nodeId, embedding);
        this.noteMap.set(nodeId, note);
      }
    } catch (error) {
      console.error('Failed to sync note:', error);
      throw error;
    }
  }

  async syncAllNotes(notes: Note[]): Promise<number> {
    await this.initialize();
    
    // Clear existing data
    this.hnsw = new HNSW();
    this.noteMap.clear();
    this.currentNodeId = 0;

    let syncedCount = 0;
    for (const note of notes) {
      try {
        await this.syncNote(note);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync note ${note.id}:`, error);
      }
    }

    return syncedCount;
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    await this.initialize();
    
    if (!this.hnsw) {
      throw new Error('HNSW index not initialized');
    }

    try {
      // Create embedding for the query
      const queryEmbedding = await createEmbedding(query);
      
      // Search using HNSW
      const results = this.hnsw.searchKNN(queryEmbedding, limit);
      
      // Convert results to SearchResult format
      return results.map(result => {
        const note = this.noteMap.get(result.id);
        if (!note) {
          console.warn(`Note not found for node ${result.id}`);
          return null;
        }
        
        return {
          noteId: note.id,
          title: note.title,
          content: note.content,
          score: result.score // HNSW returns score (similarity, higher is better)
        };
      }).filter(Boolean) as SearchResult[];
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  getEmbeddingCount(): number {
    return this.noteMap.size;
  }

  clear(): void {
    this.hnsw = new HNSW();
    this.noteMap.clear();
    this.currentNodeId = 0;
  }
}

export const semanticSearchService = new SemanticSearchService();
export { SemanticSearchService };
