
import { Note } from '@/types/notes';
import { QPSConfig, SearchResult } from './types';
import { TextProcessor } from './TextProcessor';
import { IndexStore } from './IndexStore';
import { Indexer } from './Indexer';
import { Searcher } from './Searcher';

export interface QPSSearchResult {
  noteId: string;
  title: string;
  content: string;
  score: number;
}

export interface QPSIndexStatus {
  hasIndex: boolean;
  totalDocuments: number;
  totalTokens: number;
  indexSize: number;
  needsRebuild: boolean;
}

const DEFAULT_CONFIG: Required<QPSConfig> = {
  maxSegments: 16,
  proximityBonus: 0.5,
};

class QPSService {
  private config: Required<QPSConfig>;
  private textProcessor: TextProcessor;
  private store: IndexStore;
  private indexer: Indexer;
  private searcher: Searcher;

  constructor(config: QPSConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.textProcessor = new TextProcessor();
    this.store = new IndexStore();
    this.indexer = new Indexer(this.config, this.textProcessor, this.store);
    this.searcher = new Searcher(this.config, this.textProcessor, this.store);
    
    console.log("🔮 QPSService (Quantum Proximity Search) initialized");
  }

  async search(query: string, limit: number = 10): Promise<QPSSearchResult[]> {
    if (!query.trim()) return [];
    
    console.log(`🔍 QPS searching for: "${query}"`);
    
    try {
      const results = await this.searcher.search(query);
      
      return results.slice(0, limit).map(result => {
        const doc = this.store.getDoc(result.docId);
        return {
          noteId: result.docId,
          title: this.extractTitle(result.content),
          content: result.content,
          score: result.score,
        };
      });
    } catch (error) {
      console.error('QPS search failed:', error);
      throw error;
    }
  }

  syncAllNotes(notes: Note[]): number {
    console.log(`📚 Syncing ${notes.length} notes to QPS index`);
    
    this.store.clear();
    let syncedCount = 0;

    for (const note of notes) {
      if (note.type === 'note' && note.content) {
        try {
          // Use async method synchronously for now - can be improved later
          this.indexer.index(note.id, note.content);
          syncedCount++;
        } catch (error) {
          console.warn(`Failed to index note ${note.id}:`, error);
        }
      }
    }

    console.log(`✅ QPS indexed ${syncedCount} notes`);
    return syncedCount;
  }

  getIndexStatus(): QPSIndexStatus {
    const totalDocuments = this.store.docStore.size;
    const totalTokens = Array.from(this.store.invertedIndex.keys()).length;
    
    return {
      hasIndex: totalDocuments > 0,
      totalDocuments,
      totalTokens,
      indexSize: totalDocuments,
      needsRebuild: false,
    };
  }

  clearIndex(): void {
    this.store.clear();
    console.log("🗑️ QPS index cleared");
  }

  private extractTitle(content: string): string {
    // Extract first line or first 50 characters as title
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length > 0 && firstLine.length <= 100) {
      return firstLine;
    }
    return content.substring(0, 50).trim() + (content.length > 50 ? '...' : '');
  }
}

export const qpsService = new QPSService();
export { QPSService };
