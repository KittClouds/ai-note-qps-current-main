
// Export HNSW classes
export { HNSW } from './HNSW';
export { Node } from './HNSW';
export { PriorityQueue } from './HNSW';
export { cosineSimilarity as hnswCosineSimilarity, euclideanSimilarity } from './HNSW';

// Export semantic chunking functions
export { chunkit, cramit, sentenceit, printVersion } from './chunkit';
export type { DocumentInput, ChunkResult, SentenceResult, ChunkitOptions } from './chunkit';

// Export embedding utilities
export { initializeEmbeddingUtils, createEmbedding, tokenizer } from './embeddingUtils';
export type { EmbeddingModelConfig } from './embeddingUtils';

// Export similarity utilities
export { cosineSimilarity, computeAdvancedSimilarities, adjustThreshold } from './similarityUtils';
export type { SimilarityResult, SimilarityOptions } from './similarityUtils';

// Export chunking utilities
export { createChunks, optimizeAndRebalanceChunks, applyPrefixToChunk } from './chunkingUtils';

// Export configuration
export { DEFAULT_CONFIG } from './config';
export type { ConfigType } from './config';
