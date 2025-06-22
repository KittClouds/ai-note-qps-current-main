
import { env, pipeline, AutoTokenizer, PreTrainedTokenizer } from '@huggingface/transformers';
import { LRUCache } from 'lru-cache';

let tokenizer: PreTrainedTokenizer | null = null;
let generateEmbedding: any = null;

const embeddingCache = new LRUCache<string, Float32Array>({
  max: 500,
  maxSize: 50_000_000,
  sizeCalculation: (value, key) => {
    return (value.length * 4) + key.length;
  },
  ttl: 1000 * 60 * 60,
});

export interface EmbeddingModelConfig {
  modelName: string;
  dtype: string;
}

// Define the allowed dtype values
type DtypeOption = 'fp32' | 'auto' | 'fp16' | 'q8' | 'int8' | 'uint8' | 'q4' | 'bnb4' | 'q4f16';

// Initialize embedding model and tokenizer
export async function initializeEmbeddingUtils(
  onnxEmbeddingModel: string, 
  dtype: DtypeOption = 'fp32',
  localModelPath: string | null = null,
  modelCacheDir: string | null = null
): Promise<EmbeddingModelConfig> {
  // Configure environment
  env.allowRemoteModels = true;
  if (localModelPath) env.localModelPath = localModelPath;
  if (modelCacheDir) env.cacheDir = modelCacheDir;

  tokenizer = await AutoTokenizer.from_pretrained(onnxEmbeddingModel);
  generateEmbedding = await pipeline('feature-extraction', onnxEmbeddingModel, {
    dtype: dtype as any, // Cast to any to handle the pipeline type constraints
  });

  embeddingCache.clear();

  return {
    modelName: onnxEmbeddingModel,
    dtype: dtype
  };
}

// Function to generate embeddings
export async function createEmbedding(text: string): Promise<Float32Array> {
  const cached = embeddingCache.get(text);
  if (cached) {
    return cached;
  }

  const embeddings = await generateEmbedding(text, { pooling: 'mean', normalize: true });
  const embeddingData = new Float32Array(embeddings.data);
  embeddingCache.set(text, embeddingData);
  return embeddingData;
}

export { tokenizer };
