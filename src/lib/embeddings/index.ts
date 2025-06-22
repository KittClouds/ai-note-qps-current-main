
export { HNSW } from './HNSW';
export { Node } from './HNSW/node';
export { PriorityQueue } from './HNSW/pqueue';
export { cosineSimilarity, euclideanSimilarity } from './HNSW/similarity';

// New exports for GraphRAG and embeddings
export { GraphRAG, type GraphNode, type RankedNode, type GraphEdge, type SimilarityIndex } from './graphrag';
export { HNSWAdapter } from './hnswAdapter';
export { EmbeddingsService, embeddingsService } from './embeddingsService';
export { chunkText, extractTextFromTipTapDocument, createNoteChunks, type TextChunk } from './textProcessing';
