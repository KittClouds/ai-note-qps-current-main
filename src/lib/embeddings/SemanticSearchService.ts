
import { graphRAGSearchService, SearchResult } from './GraphRAGSearchService';

class SemanticSearchService {
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    return graphRAGSearchService.search(query, limit);
  }
}

export const semanticSearchService = new SemanticSearchService();
