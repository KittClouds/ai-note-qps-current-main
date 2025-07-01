
export { HNSW } from './HNSW';
export { Node } from './HNSW/node';
export { PriorityQueue } from './HNSW/pqueue';
export { cosineSimilarity, euclideanSimilarity } from './HNSW/similarity';
export { encodeGraph, decodeGraph } from './HNSW/serialize';
export { HnswPersistence, hnswPersistence } from './HNSW/persistence';

// New exports for GraphRAG and embeddings
export { GraphRAG, type GraphNode, type RankedNode, type GraphEdge, type SimilarityIndex } from './graphrag';
export { HNSWAdapter } from './hnswAdapter';
export { EmbeddingsService, embeddingsService } from './embeddingsService';
export { chunkText, extractTextFromTipTapDocument, createNoteChunks, type TextChunk } from './textProcessing';

// New exports for semantic chunking
export { SemanticChunker, semanticChunker } from './semanticChunking';
export { SEMANTIC_CHUNKING_CONFIG, type SemanticChunkingOptions, type SemanticChunk } from './semanticChunkingConfig';
export { chunkitSemantic, cramitBasic, sentenceitSplit, createNoteChunksSemantic } from './textProcessing';

// Provider exports
export * from './providers';

// BM25 exports
export { default as BM25, type BMDocument, type BMConstants, type BMSorter } from '../bm25/bm25';
export { BM25Service, bm25Service, type BM25SearchResult, type BM25IndexStatus } from '../bm25/bm25Service';

// Hybrid Search exports
export { hybridSearchService, HybridSearchService, type HybridSearchResult, type HybridSearchOptions } from '../search/hybridSearchService';
