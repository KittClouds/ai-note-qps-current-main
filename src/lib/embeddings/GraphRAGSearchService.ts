
import { HNSW } from './HNSW';
import { initializeEmbeddingUtils, createEmbedding } from './embeddingUtils';
import { Note } from '@/types/notes';

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

class GraphRAGSearchService {
  private vectorIndex: HNSW | null = null;
  private noteEmbeddings: Map<string, Float32Array> = new Map();
  private noteMetadata: Map<string, { title: string; content: string }> = new Map();
  private graphConnections: Map<string, Set<string>> = new Map();
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await initializeEmbeddingUtils('Xenova/all-MiniLM-L6-v2', 'q8');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize GraphRAG service:', error);
      throw error;
    }
  }

  async syncAllNotes(notes: Note[]): Promise<number> {
    await this.initialize();
    
    // Clear existing data
    this.noteEmbeddings.clear();
    this.noteMetadata.clear();
    this.graphConnections.clear();
    
    if (notes.length === 0) {
      this.vectorIndex = null;
      return 0;
    }

    // Generate embeddings for all notes
    const embeddings: Float32Array[] = [];
    
    for (const note of notes) {
      if (note.type === 'note' && note.content) {
        try {
          const embedding = await createEmbedding(note.content);
          this.noteEmbeddings.set(note.id, embedding);
          this.noteMetadata.set(note.id, {
            title: note.title,
            content: note.content
          });
          embeddings.push(embedding);
          
          // Build graph connections based on content analysis
          this.buildGraphConnections(note, notes);
        } catch (error) {
          console.error(`Failed to create embedding for note ${note.id}:`, error);
        }
      }
    }

    // Build HNSW index
    if (embeddings.length > 0) {
      const dimension = embeddings[0].length;
      this.vectorIndex = new HNSW(dimension, 16, 200, 'cosine');
      
      let index = 0;
      for (const [noteId] of this.noteEmbeddings) {
        const embedding = this.noteEmbeddings.get(noteId);
        if (embedding) {
          this.vectorIndex.addPoint(embedding, index);
          index++;
        }
      }
    }

    return this.noteEmbeddings.size;
  }

  private buildGraphConnections(note: Note, allNotes: Note[]) {
    const connections = new Set<string>();
    const noteContent = note.content.toLowerCase();
    
    // Find references to other notes
    allNotes.forEach(otherNote => {
      if (otherNote.id !== note.id && otherNote.type === 'note') {
        const titleWords = otherNote.title.toLowerCase().split(/\s+/);
        const hasReference = titleWords.some(word => 
          word.length > 2 && noteContent.includes(word)
        );
        
        if (hasReference) {
          connections.add(otherNote.id);
        }
      }
    });
    
    this.graphConnections.set(note.id, connections);
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!this.isInitialized || !this.vectorIndex || this.noteEmbeddings.size === 0) {
      return [];
    }

    try {
      const queryEmbedding = await createEmbedding(query);
      const searchResults = this.vectorIndex.searchKnn(queryEmbedding, Math.min(limit * 2, 50));
      
      const results: SearchResult[] = [];
      const noteIds = Array.from(this.noteEmbeddings.keys());
      
      for (const result of searchResults) {
        const noteId = noteIds[result.id];
        const metadata = this.noteMetadata.get(noteId);
        
        if (metadata && result.distance < 0.8) { // Filter by similarity threshold
          const score = 1 - result.distance;
          const graphScore = this.calculateGraphScore(noteId, query);
          
          results.push({
            noteId,
            title: metadata.title,
            content: metadata.content,
            score,
            graphScore
          });
        }
      }

      // Sort by combined score (semantic + graph)
      return results
        .sort((a, b) => {
          const scoreA = a.score + (a.graphScore || 0) * 0.3;
          const scoreB = b.score + (b.graphScore || 0) * 0.3;
          return scoreB - scoreA;
        })
        .slice(0, limit);
        
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  private calculateGraphScore(noteId: string, query: string): number {
    const connections = this.graphConnections.get(noteId);
    if (!connections || connections.size === 0) return 0;
    
    // Simple graph scoring based on connected notes relevance
    let graphScore = 0;
    const queryLower = query.toLowerCase();
    
    connections.forEach(connectedId => {
      const metadata = this.noteMetadata.get(connectedId);
      if (metadata) {
        const titleMatch = metadata.title.toLowerCase().includes(queryLower);
        const contentMatch = metadata.content.toLowerCase().includes(queryLower);
        if (titleMatch || contentMatch) {
          graphScore += 0.1;
        }
      }
    });
    
    return Math.min(graphScore, 1.0);
  }

  getIndexStatus(): IndexStatus {
    return {
      hasIndex: this.vectorIndex !== null,
      indexSize: this.noteEmbeddings.size,
      needsRebuild: false,
      graphNodes: this.noteMetadata.size,
      graphEdges: Array.from(this.graphConnections.values())
        .reduce((total, connections) => total + connections.size, 0)
    };
  }
}

export const graphRAGSearchService = new GraphRAGSearchService();
