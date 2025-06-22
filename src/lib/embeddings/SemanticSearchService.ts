
import { createEmbedding, initializeEmbeddingUtils } from './embeddingUtils';
import { HNSW, cosineSimilarity as hnswCosineSimilarity } from './HNSW';
import { Note } from '@/types/notes';

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
  private embeddingCount = 0;

  async initialize() {
    if (this.initialized) return;
    
    try {
      await initializeEmbeddingUtils('Xenova/all-MiniLM-L6-v2', 'q8');
      this.hnsw = new HNSW(384, 16, 200); // MiniLM-L6-v2 has 384 dimensions
      this.initialized = true;
      console.log('SemanticSearchService initialized');
    } catch (error) {
      console.error('Failed to initialize SemanticSearchService:', error);
      throw error;
    }
  }

  async syncNote(note: Note): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Extract text content from the note
      let textContent = '';
      if (typeof note.content === 'string') {
        try {
          const contentObj = JSON.parse(note.content);
          textContent = this.extractTextFromContent(contentObj);
        } catch {
          textContent = note.content;
        }
      }

      if (!textContent.trim()) return;

      // Create embedding
      const embedding = await createEmbedding(textContent);
      
      // Add to HNSW index
      const nodeId = this.hnsw!.addPoint(Array.from(embedding));
      
      // Store note mapping
      this.noteMap.set(nodeId, note);
      this.embeddingCount++;
      
      console.log(`Indexed note "${note.title}" with ID ${nodeId}`);
    } catch (error) {
      console.error(`Failed to sync note "${note.title}":`, error);
    }
  }

  async syncAllNotes(notes: Note[]): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Clear existing index
    this.hnsw = new HNSW(384, 16, 200);
    this.noteMap.clear();
    this.embeddingCount = 0;

    for (const note of notes) {
      await this.syncNote(note);
    }

    return this.embeddingCount;
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!query.trim() || !this.hnsw || this.embeddingCount === 0) {
      return [];
    }

    try {
      // Create query embedding
      const queryEmbedding = await createEmbedding(query);
      
      // Search HNSW index
      const searchResults = this.hnsw.search(Array.from(queryEmbedding), limit);
      
      // Convert to SearchResult format
      const results: SearchResult[] = [];
      
      for (const result of searchResults) {
        const note = this.noteMap.get(result.node.id);
        if (note) {
          let textContent = '';
          if (typeof note.content === 'string') {
            try {
              const contentObj = JSON.parse(note.content);
              textContent = this.extractTextFromContent(contentObj);
            } catch {
              textContent = note.content;
            }
          }

          results.push({
            noteId: note.id,
            title: note.title,
            content: textContent,
            score: result.distance // HNSW returns similarity as distance
          });
        }
      }

      return results.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  getEmbeddingCount(): number {
    return this.embeddingCount;
  }

  private extractTextFromContent(contentObj: any): string {
    if (!contentObj || typeof contentObj !== 'object') return '';
    
    let text = '';
    
    if (contentObj.content && Array.isArray(contentObj.content)) {
      for (const node of contentObj.content) {
        text += this.extractTextFromNode(node) + ' ';
      }
    }
    
    return text.trim();
  }

  private extractTextFromNode(node: any): string {
    if (!node || typeof node !== 'object') return '';
    
    let text = '';
    
    if (node.text) {
      text += node.text;
    }
    
    if (node.content && Array.isArray(node.content)) {
      for (const childNode of node.content) {
        text += this.extractTextFromNode(childNode) + ' ';
      }
    }
    
    return text;
  }
}

export const semanticSearchService = new SemanticSearchService();
export { SemanticSearchService };
