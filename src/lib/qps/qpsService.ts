
import { Indexer } from '../embedding/quantum/Indexer';
import { Searcher } from '../embedding/quantum/Searcher';
import { TextProcessor } from '../embedding/quantum/TextProcessor';
import { IndexStore } from '../embedding/quantum/IndexStore';
import { QPSConfig, SearchResult } from '../embedding/quantum/types';
import { Note } from '@/types/notes';

export interface QPSSearchResult {
  noteId: string;
  title: string;
  content: string;
  score: number;
}

export interface QPSIndexStatus {
  hasIndex: boolean;
  indexSize: number;
  totalDocuments: number;
  needsRebuild: boolean;
}

export class QPSService {
  private config: Required<QPSConfig>;
  private textProcessor: TextProcessor;
  private store: IndexStore;
  private indexer: Indexer;
  private searcher: Searcher;
  private isInitialized = false;

  constructor() {
    this.config = {
      maxSegments: 32,
      proximityBonus: 0.5
    };
    
    this.textProcessor = new TextProcessor();
    this.store = new IndexStore();
    this.indexer = new Indexer(this.config, this.textProcessor, this.store);
    this.searcher = new Searcher(this.config, this.textProcessor, this.store);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('[QPSService] Initializing quantum proximity search...');
    this.isInitialized = true;
    console.log('[QPSService] Initialization complete');
  }

  async search(query: string, limit: number = 10): Promise<QPSSearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!query.trim()) return [];

    try {
      console.log(`[QPSService] Searching for: "${query}"`);
      
      const results = await this.searcher.search(query);
      
      // Convert to QPSSearchResult format and apply limit
      const qpsResults = results.slice(0, limit).map(result => {
        // Extract note info from docId (assuming format: noteId)
        const noteId = result.docId;
        
        // Try to extract title from content (first line)
        const lines = result.content.split('\n');
        const title = lines[0].slice(0, 50) || 'Untitled';
        
        return {
          noteId,
          title,
          content: result.content,
          score: result.score
        };
      });

      console.log(`[QPSService] Found ${qpsResults.length} QPS results`);
      return qpsResults;
    } catch (error) {
      console.error('QPS search failed:', error);
      throw error;
    }
  }

  syncAllNotes(notes: Note[]): number {
    console.log(`[QPSService] Syncing ${notes.length} notes to QPS index`);
    
    // Clear existing index
    this.store.clear();
    
    let syncedCount = 0;
    
    for (const note of notes) {
      try {
        // Use the indexer to process and store the note
        this.indexer.index(note.id, note.content);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync note ${note.id} to QPS:`, error);
      }
    }
    
    console.log(`[QPSService] Successfully synced ${syncedCount} notes to QPS index`);
    return syncedCount;
  }

  getIndexStatus(): QPSIndexStatus {
    const totalDocuments = this.store.docStore.size;
    const hasIndex = totalDocuments > 0;
    
    return {
      hasIndex,
      indexSize: this.store.invertedIndex.size,
      totalDocuments,
      needsRebuild: false
    };
  }

  clearIndex(): void {
    console.log('[QPSService] Clearing QPS index');
    this.store.clear();
  }

  removeNote(noteId: string): void {
    console.log(`[QPSService] Removing note ${noteId} from QPS index`);
    this.store.removeDocument(noteId);
  }
}

// Create a singleton instance
export const qpsService = new QPSService();
