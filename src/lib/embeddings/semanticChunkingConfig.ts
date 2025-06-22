
export const SEMANTIC_CHUNKING_CONFIG = {
  LOGGING: false,
  MAX_TOKEN_SIZE: 500,
  SIMILARITY_THRESHOLD: 0.5,
  DYNAMIC_THRESHOLD_LOWER_BOUND: 0.4,
  DYNAMIC_THRESHOLD_UPPER_BOUND: 0.8,
  NUM_SIMILARITY_SENTENCES_LOOKAHEAD: 3,
  COMBINE_CHUNKS: true,
  COMBINE_CHUNKS_SIMILARITY_THRESHOLD: 0.5,
  EMBEDDING_MODEL: "Snowflake/snowflake-arctic-embed-s",
  RETURN_EMBEDDING: false,
  RETURN_TOKEN_LENGTH: true,
  CHUNK_PREFIX: null,
  EXCLUDE_CHUNK_PREFIX_IN_RESULTS: false,
};

export interface SemanticChunkingOptions {
  logging?: boolean;
  maxTokenSize?: number;
  similarityThreshold?: number;
  dynamicThresholdLowerBound?: number;
  dynamicThresholdUpperBound?: number;
  numSimilaritySentencesLookahead?: number;
  combineChunks?: boolean;
  combineChunksSimilarityThreshold?: number;
  returnEmbedding?: boolean;
  returnTokenLength?: boolean;
  chunkPrefix?: string;
  excludeChunkPrefixInResults?: boolean;
}

export interface SemanticChunk {
  document_id: number;
  document_name: string;
  number_of_chunks: number;
  chunk_number: number;
  model_name: string;
  text: string;
  embedding?: number[];
  token_length?: number;
}
