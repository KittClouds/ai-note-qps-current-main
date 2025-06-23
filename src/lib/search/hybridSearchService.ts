
import { bm25Service, BM25SearchResult } from '../bm25/bm25Service';
import { embeddingsService, SearchResult as EmbeddingSearchResult } from '../embeddings/embeddingsService';
import { Note } from '@/types/notes';

export interface HybridSearchResult {
  noteId: string;
  title: string;
  content: string;
  fusedScore: number;
  sparseScore?: number;
  denseScore?: number;
}

export interface HybridSearchOptions {
  limit?: number;
  alpha: number; // 0.0 = sparse only, 1.0 = dense only
}

class HybridSearchService {
  constructor(
    private bm25: typeof bm25Service,
    private embeddings: typeof embeddingsService
  ) {
    console.log("🎶 HybridSearchService conductor is ready to orchestrate.");
  }

  async search(query: string, options: HybridSearchOptions): Promise<HybridSearchResult[]> {
    const { limit = 10, alpha } = options;

    if (!query.trim()) return [];
    if (alpha < 0 || alpha > 1) {
      throw new Error("Alpha must be between 0.0 and 1.0.");
    }
    
    console.log(`--- Initiating Hybrid Search (alpha: ${alpha}) for: "${query}" ---`);

    const searchLimit = limit * 3;

    const [sparseResults, denseResults] = await Promise.all([
      this.bm25.search(query, searchLimit),
      this.embeddings.search(query, searchLimit),
    ]);
    
    console.log(`- Sparse (BM25) search returned ${sparseResults.length} results.`);
    console.log(`- Dense (Embeddings) search returned ${denseResults.length} results.`);

    const fusedResults = this.fuseResults(sparseResults, denseResults, alpha);

    const finalResults = fusedResults
      .sort((a, b) => b.fusedScore - a.fusedScore)
      .slice(0, limit);

    console.log(`- Fusion complete. Returning top ${finalResults.length} results.`);
    return finalResults;
  }

  private fuseResults(
    sparse: BM25SearchResult[], 
    dense: EmbeddingSearchResult[], 
    alpha: number
  ): HybridSearchResult[] {
    
    const maxSparseScore = Math.max(...sparse.map(r => r.score), 0);
    const maxDenseScore = Math.max(...dense.map(r => r.score), 0);
    
    const normalizedSparse = sparse.map(r => ({ ...r, score: maxSparseScore > 0 ? r.score / maxSparseScore : 0 }));
    const normalizedDense = dense.map(r => ({ ...r, score: maxDenseScore > 0 ? r.score / maxDenseScore : 0 }));

    const scoreMap = new Map<string, Partial<HybridSearchResult>>();

    normalizedSparse.forEach(res => {
      scoreMap.set(res.noteId, {
        ...res,
        sparseScore: res.score,
      });
    });

    normalizedDense.forEach(res => {
      const existing = scoreMap.get(res.noteId) || {};
      scoreMap.set(res.noteId, {
        ...existing,
        noteId: res.noteId,
        title: existing.title || res.title,
        content: existing.content || res.content,
        denseScore: res.score,
      });
    });

    const finalResults: HybridSearchResult[] = [];
    for (const [noteId, scores] of scoreMap.entries()) {
      const sparseContribution = (1 - alpha) * (scores.sparseScore || 0);
      const denseContribution = alpha * (scores.denseScore || 0);
      
      finalResults.push({
        noteId: noteId,
        title: scores.title!,
        content: scores.content!,
        fusedScore: sparseContribution + denseContribution,
        sparseScore: scores.sparseScore,
        denseScore: scores.denseScore,
      });
    }

    return finalResults;
  }

  async syncAllNotes(notes: Note[]): Promise<void> {
    console.log("--- Syncing notes across all search services ---");
    await Promise.all([
      this.bm25.syncAllNotes(notes),
      this.embeddings.syncAllNotes(notes, 'semantic')
    ]);
    console.log("--- All services synced. ---");
  }

  clearAll(): void {
    this.bm25.clearIndex();
    this.embeddings.clear();
  }

  getIndexStatus() {
    return {
      bm25: this.bm25.getIndexStatus(),
      embeddings: this.embeddings.getIndexStatus()
    };
  }
}

export const hybridSearchService = new HybridSearchService(bm25Service, embeddingsService);
export { HybridSearchService };
