
import { pipeline, PipelineType } from "@huggingface/transformers";

class NomicFeatureExtractionPipeline {
  static task: PipelineType = "feature-extraction";
  static model = "nomic-ai/nomic-embed-text-v1.5";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, {
        progress_callback,
      });
    }

    return this.instance;
  }
}

// Request queue for handling multiple embedding requests
const requestQueue = new Map();
let isProcessing = false;
let isInitialized = false;

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { type, id, texts, options } = event.data;

  if (type === 'initialize') {
    try {
      console.log('[NomicWorker] Initializing Nomic Embed Text v1.5 model...');
      
      const extractor = await NomicFeatureExtractionPipeline.getInstance((x) => {
        self.postMessage({ type: 'progress', data: x });
      });

      isInitialized = true;
      self.postMessage({ type: 'ready' });
      console.log('[NomicWorker] Nomic model ready');
    } catch (error) {
      console.error('[NomicWorker] Failed to initialize:', error);
      self.postMessage({ type: 'error', error: error.message });
    }
    return;
  }

  if (type === 'generate') {
    if (!isInitialized) {
      self.postMessage({
        type: 'error',
        id,
        error: 'Worker not initialized'
      });
      return;
    }

    // Handle batch requests
    if (Array.isArray(texts)) {
      try {
        const extractor = await NomicFeatureExtractionPipeline.getInstance();

        console.log(`[NomicWorker] Processing ${texts.length} texts`);

        const embeddings = await extractor(texts, {
          pooling: "mean",
          normalize: true,
        });

        // Send batch results back
        self.postMessage({
          type: 'complete',
          id,
          embeddings: embeddings.tolist()
        });
      } catch (error) {
        console.error('[NomicWorker] Generation failed:', error);
        self.postMessage({
          type: 'error',
          id,
          error: error.message
        });
      }
      return;
    }

    // Handle single requests with queue
    if (id) {
      requestQueue.set(id, { texts, options });
      
      if (!isProcessing) {
        processQueue();
      }
      return;
    }
  }
});

async function processQueue() {
  if (isProcessing || requestQueue.size === 0 || !isInitialized) return;
  
  isProcessing = true;
  
  try {
    const extractor = await NomicFeatureExtractionPipeline.getInstance();
    
    // Process requests in batches for efficiency
    const batchSize = 5;
    const entries = Array.from(requestQueue.entries());
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const batchTexts = batch.map(([_, { texts }]) => {
        return Array.isArray(texts) ? texts[0] : texts;
      });
      
      const embeddings = await extractor(batchTexts, {
        pooling: "mean",
        normalize: true,
      });
      
      const embeddingList = embeddings.tolist();
      
      // Send individual responses
      batch.forEach(([id], index) => {
        self.postMessage({
          type: 'complete',
          id,
          embedding: [embeddingList[index]]
        });
        requestQueue.delete(id);
      });
    }
  } catch (error) {
    console.error('[NomicWorker] Queue processing failed:', error);
    // Send error to all pending requests
    for (const [id] of requestQueue) {
      self.postMessage({
        type: 'error',
        id,
        error: error.message
      });
    }
    requestQueue.clear();
  }
  
  isProcessing = false;
  
  // Process any new requests that came in
  if (requestQueue.size > 0) {
    setTimeout(processQueue, 10);
  }
}
