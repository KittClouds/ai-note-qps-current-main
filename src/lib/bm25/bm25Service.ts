
import BM25, { BMDocument, BMConstants } from './bm25';
import { Note } from '@/types/notes';

export interface BM25SearchResult {
  noteId: string;
  title: string;
  content: string;
  score: number;
}

export interface BM25IndexStatus {
  hasIndex: boolean;
  indexSize: number;
  totalDocuments: number;
  totalTerms: number;
  needsRebuild: boolean;
}

class BM25Service {
  private documents: string[] = [];
  private noteMap: Map<number, Note> = new Map();
  private lastSyncTime: number = 0;
  private constants: BMConstants = { k1: 1.2, b: 0.75 };

  private preprocessText(text: string): string {
    // Basic text preprocessing: lowercase, remove extra whitespace
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private tokenize(text: string): string[] {
    // Simple tokenization: split by non-word characters
    return text.match(/\w+/g) || [];
  }

  syncAllNotes(notes: Note[]): number {
    console.log('BM25Service: Syncing notes...', notes.length);
    
    this.documents = [];
    this.noteMap.clear();

    notes.forEach((note, index) => {
      // Combine title and content for better search results
      const combinedText = `${note.title} ${note.content}`;
      const preprocessedText = this.preprocessText(combinedText);
      
      this.documents.push(preprocessedText);
      this.noteMap.set(index, note);
    });

    this.lastSyncTime = Date.now();
    console.log('BM25Service: Sync completed', this.documents.length, 'documents');
    
    return this.documents.length;
  }

  search(query: string, limit: number = 10): BM25SearchResult[] {
    if (!query.trim() || this.documents.length === 0) {
      return [];
    }

    console.log('BM25Service: Searching for:', query);
    
    const keywords = this.tokenize(this.preprocessText(query));
    if (keywords.length === 0) {
      return [];
    }

    // Use BM25 with sorting
    const sorter = (a: BMDocument, b: BMDocument) => b.score - a.score;
    const results = BM25(this.documents, keywords, this.constants, sorter) as BMDocument[];

    // Convert to BM25SearchResult format
    const searchResults: BM25SearchResult[] = [];
    
    for (let i = 0; i < Math.min(results.length, limit); i++) {
      const result = results[i];
      if (result.score > 0) { // Only include results with positive scores
        const note = this.noteMap.get(this.documents.indexOf(result.document));
        if (note) {
          searchResults.push({
            noteId: note.id,
            title: note.title,
            content: note.content.substring(0, 200) + '...',
            score: result.score
          });
        }
      }
    }

    console.log('BM25Service: Found', searchResults.length, 'results');
    return searchResults;
  }

  getIndexStatus(): BM25IndexStatus {
    const totalTerms = new Set(
      this.documents.flatMap(doc => this.tokenize(doc))
    ).size;

    return {
      hasIndex: this.documents.length > 0,
      indexSize: this.documents.length,
      totalDocuments: this.documents.length,
      totalTerms,
      needsRebuild: false
    };
  }

  clearIndex(): void {
    this.documents = [];
    this.noteMap.clear();
    this.lastSyncTime = 0;
  }
}

export const bm25Service = new BM25Service();
export { BM25Service };
