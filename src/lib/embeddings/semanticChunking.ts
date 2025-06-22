
import { parseSentences } from './sentenceParser';
import { cosineSimilarity } from './HNSW/similarity';
import { SEMANTIC_CHUNKING_CONFIG, SemanticChunkingOptions, SemanticChunk } from './semanticChunkingConfig';

// Simple tokenizer approximation (you can enhance this based on your needs)
function approximateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

export class SemanticChunker {
  private embeddingQueue = new Map<string, { resolve: Function; reject: Function }>();
  private requestId = 0;
  private worker: Worker | null = null;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    if (typeof window !== 'undefined') {
      this.worker = new Worker(
        new URL('./embeddingsWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event) => {
        const { type, id, embedding, error } = event.data;
        
        if (type === 'complete' && id) {
          const request = this.embeddingQueue.get(id);
          if (request) {
            request.resolve(embedding);
            this.embeddingQueue.delete(id);
          }
        } else if (type === 'error' && id) {
          const request = this.embeddingQueue.get(id);
          if (request) {
            request.reject(new Error(error));
            this.embeddingQueue.delete(id);
          }
        }
      };
    }
  }

  private async createEmbedding(text: string): Promise<number[]> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = `emb_${this.requestId++}`;
    
    return new Promise((resolve, reject) => {
      this.embeddingQueue.set(id, { resolve, reject });
      this.worker!.postMessage({
        id,
        text,
        isQuery: false
      });
    });
  }

  private async computeAdvancedSimilarities(
    sentences: string[],
    options: { numSimilaritySentencesLookahead: number; logging: boolean }
  ) {
    if (sentences.length < 2) {
      return { similarities: [], average: null, variance: null };
    }

    const embeddings = await Promise.all(
      sentences.map(sentence => this.createEmbedding(sentence))
    );

    const similarities: number[] = [];
    
    for (let i = 0; i < sentences.length - 1; i++) {
      const currentEmbedding = embeddings[i];
      const lookaheadEmbeddings = [];
      
      for (let j = 1; j <= options.numSimilaritySentencesLookahead && i + j < sentences.length; j++) {
        lookaheadEmbeddings.push(embeddings[i + j]);
      }
      
      // Compute average similarity with lookahead sentences
      const sims = lookaheadEmbeddings.map(emb => cosineSimilarity(currentEmbedding, emb));
      const avgSim = sims.reduce((a, b) => a + b, 0) / sims.length;
      similarities.push(avgSim);
    }

    const average = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const variance = similarities.reduce((acc, sim) => acc + Math.pow(sim - average, 2), 0) / similarities.length;

    if (options.logging) {
      console.log(`Computed ${similarities.length} similarities. Average: ${average.toFixed(4)}, Variance: ${variance.toFixed(4)}`);
    }

    return { similarities, average, variance };
  }

  private adjustThreshold(
    average: number,
    variance: number,
    baseThreshold: number,
    lowerBound: number,
    upperBound: number
  ): number {
    // If variance is high, use a higher threshold to be more selective
    // If variance is low, use a lower threshold to be more inclusive
    const adjustment = variance * 0.5;
    let adjustedThreshold = baseThreshold + adjustment;
    
    // Clamp between bounds
    adjustedThreshold = Math.max(lowerBound, Math.min(upperBound, adjustedThreshold));
    
    return adjustedThreshold;
  }

  private createChunks(
    sentences: string[],
    similarities: number[] | null,
    maxTokenSize: number,
    similarityThreshold: number,
    logging: boolean
  ): string[] {
    let chunks: string[] = [];
    let currentChunk = [sentences[0]];
    
    if (logging) {
      console.log('Initial sentence:', sentences[0]);
    }

    for (let i = 1; i < sentences.length; i++) {
      const nextSentence = sentences[i];
      
      // For basic chunking (when similarities is null), only check token size
      if (!similarities) {
        const currentChunkText = currentChunk.join(" ");
        const currentChunkSize = approximateTokenCount(currentChunkText);
        const nextSentenceTokenCount = approximateTokenCount(nextSentence);
        
        if (currentChunkSize + nextSentenceTokenCount <= maxTokenSize) {
          currentChunk.push(nextSentence);
        } else {
          chunks.push(currentChunkText);
          currentChunk = [nextSentence];
        }
        continue;
      }

      // Check similarity first for semantic chunking
      if (similarities[i - 1] >= similarityThreshold) {
        if (logging) {
          console.log(`Adding sentence ${i} with similarity ${similarities[i - 1]}`);
        }
        
        // Then check token size
        const currentChunkText = currentChunk.join(" ");
        const currentChunkSize = approximateTokenCount(currentChunkText);
        const nextSentenceTokenCount = approximateTokenCount(nextSentence);
        
        if (currentChunkSize + nextSentenceTokenCount <= maxTokenSize) {
          currentChunk.push(nextSentence);
        } else {
          chunks.push(currentChunkText);
          currentChunk = [nextSentence];
        }
      } else {
        if (logging) {
          console.log(`Starting new chunk at sentence ${i}, similarity was ${similarities[i - 1]}`);
        }
        chunks.push(currentChunk.join(" "));
        currentChunk = [nextSentence];
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
    }

    return chunks;
  }

  private async optimizeAndRebalanceChunks(
    chunks: string[],
    maxTokenSize: number,
    combineChunksSimilarityThreshold: number
  ): Promise<string[]> {
    let optimizedChunks: string[] = [];
    let currentChunkText = "";
    let currentChunkTokenCount = 0;
    let currentEmbedding: number[] | null = null;

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const chunkTokenCount = approximateTokenCount(chunk);

      if (currentChunkText && (currentChunkTokenCount + chunkTokenCount <= maxTokenSize)) {
        const nextEmbedding = await this.createEmbedding(chunk);
        const similarity = currentEmbedding ? cosineSimilarity(currentEmbedding, nextEmbedding) : 0;

        if (similarity >= combineChunksSimilarityThreshold) {
          currentChunkText += " " + chunk;
          currentChunkTokenCount += chunkTokenCount;
          currentEmbedding = nextEmbedding;
          continue;
        }
      }

      if (currentChunkText) optimizedChunks.push(currentChunkText);
      currentChunkText = chunk;
      currentChunkTokenCount = chunkTokenCount;
      currentEmbedding = await this.createEmbedding(chunk);
    }

    if (currentChunkText) optimizedChunks.push(currentChunkText);

    return optimizedChunks.filter(chunk => chunk);
  }

  private applyPrefixToChunk(chunkPrefix: string | null, chunk: string): string {
    if (chunkPrefix && chunkPrefix.trim()) {
      return `${chunkPrefix}: ${chunk}`;
    }
    return chunk;
  }

  // Main semantic chunking function
  async chunkit(
    documents: Array<{ document_text: string; document_name?: string }>,
    options: SemanticChunkingOptions = {}
  ): Promise<SemanticChunk[]> {
    const config = { ...SEMANTIC_CHUNKING_CONFIG, ...options };

    if (!Array.isArray(documents)) {
      throw new Error('Input must be an array of document objects');
    }

    const allResults = await Promise.all(documents.map(async (doc) => {
      if (!doc.document_text) {
        throw new Error('Each document must have a document_text property');
      }

      // Normalize document text
      let normalizedText = doc.document_text.replace(/([^\n])\n([^\n])/g, '$1 $2');
      normalizedText = normalizedText.replace(/\s{2,}/g, ' ');

      // Split the text into sentences
      const sentences = await parseSentences(normalizedText);

      // Compute similarities and create chunks
      const { similarities, average, variance } = await this.computeAdvancedSimilarities(
        sentences,
        {
          numSimilaritySentencesLookahead: config.numSimilaritySentencesLookahead!,
          logging: config.logging!,
        }
      );

      // Dynamically adjust the similarity threshold
      let dynamicThreshold = config.similarityThreshold!;
      if (average != null && variance != null) {
        dynamicThreshold = this.adjustThreshold(
          average,
          variance,
          config.similarityThreshold!,
          config.dynamicThresholdLowerBound!,
          config.dynamicThresholdUpperBound!
        );
      }

      // Create the initial chunks
      const initialChunks = this.createChunks(
        sentences,
        similarities,
        config.maxTokenSize!,
        dynamicThreshold,
        config.logging!
      );

      let finalChunks: string[];

      // Combine similar chunks if requested
      if (config.combineChunks) {
        finalChunks = await this.optimizeAndRebalanceChunks(
          initialChunks,
          config.maxTokenSize!,
          config.combineChunksSimilarityThreshold!
        );
      } else {
        finalChunks = initialChunks;
      }

      const documentName = doc.document_name || "";
      const documentId = Date.now();
      const numberOfChunks = finalChunks.length;

      return Promise.all(finalChunks.map(async (chunk, index) => {
        const prefixedChunk = this.applyPrefixToChunk(config.chunkPrefix!, chunk);
        const result: SemanticChunk = {
          document_id: documentId,
          document_name: documentName,
          number_of_chunks: numberOfChunks,
          chunk_number: index + 1,
          model_name: SEMANTIC_CHUNKING_CONFIG.EMBEDDING_MODEL,
          text: prefixedChunk
        };

        if (config.returnEmbedding) {
          result.embedding = await this.createEmbedding(prefixedChunk);
        }

        if (config.returnTokenLength) {
          result.token_length = approximateTokenCount(prefixedChunk);
        }

        // Remove prefix if requested
        if (config.excludeChunkPrefixInResults && config.chunkPrefix && config.chunkPrefix.trim()) {
          const prefixPattern = new RegExp(`^${config.chunkPrefix}:\\s*`);
          result.text = result.text.replace(prefixPattern, '');
        }

        return result;
      }));
    }));

    return allResults.flat();
  }

  // Basic chunking function (no similarity)
  async cramit(
    documents: Array<{ document_text: string; document_name?: string }>,
    options: SemanticChunkingOptions = {}
  ): Promise<SemanticChunk[]> {
    const config = { ...SEMANTIC_CHUNKING_CONFIG, ...options };

    const allResults = await Promise.all(documents.map(async (doc) => {
      const sentences = await parseSentences(doc.document_text);
      const chunks = this.createChunks(sentences, null, config.maxTokenSize!, 0, config.logging!);
      
      const documentName = doc.document_name || "";
      const documentId = Date.now();

      return Promise.all(chunks.map(async (chunk, index) => {
        const prefixedChunk = this.applyPrefixToChunk(config.chunkPrefix!, chunk);
        const result: SemanticChunk = {
          document_id: documentId,
          document_name: documentName,
          number_of_chunks: chunks.length,
          chunk_number: index + 1,
          model_name: SEMANTIC_CHUNKING_CONFIG.EMBEDDING_MODEL,
          text: prefixedChunk
        };

        if (config.returnEmbedding) {
          result.embedding = await this.createEmbedding(prefixedChunk);
        }

        if (config.returnTokenLength) {
          result.token_length = approximateTokenCount(prefixedChunk);
        }

        return result;
      }));
    }));

    return allResults.flat();
  }

  // Sentence-level splitting
  async sentenceit(
    documents: Array<{ document_text: string; document_name?: string }>,
    options: SemanticChunkingOptions = {}
  ): Promise<SemanticChunk[]> {
    const config = { ...SEMANTIC_CHUNKING_CONFIG, ...options };

    const allResults = await Promise.all(documents.map(async (doc) => {
      const sentences = await parseSentences(doc.document_text);
      
      const documentName = doc.document_name || "";
      const documentId = Date.now();

      return Promise.all(sentences.map(async (sentence, index) => {
        const prefixedSentence = this.applyPrefixToChunk(config.chunkPrefix!, sentence);
        const result: SemanticChunk = {
          document_id: documentId,
          document_name: documentName,
          number_of_chunks: sentences.length,
          chunk_number: index + 1,
          model_name: SEMANTIC_CHUNKING_CONFIG.EMBEDDING_MODEL,
          text: prefixedSentence
        };

        if (config.returnEmbedding) {
          result.embedding = await this.createEmbedding(prefixedSentence);
        }

        if (config.returnTokenLength) {
          result.token_length = approximateTokenCount(prefixedSentence);
        }

        return result;
      }));
    }));

    return allResults.flat();
  }

  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Create a singleton instance
export const semanticChunker = new SemanticChunker();
