
import { pipeline, PipelineType } from "@huggingface/transformers";

class MyFeatureExtractionPipeline {
  static task: PipelineType = "feature-extraction";
  static model = "Snowflake/snowflake-arctic-embed-s";
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

// Define the query prefix required by the Snowflake model
const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";

// Request queue for handling multiple embedding requests
const requestQueue = new Map();
let isProcessing = false;

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { id, source, text, isQuery = false, batch = false } = event.data;

  // Handle batch requests
  if (batch && Array.isArray(text)) {
    try {
      const extractor = await MyFeatureExtractionPipeline.getInstance((x) => {
        self.postMessage({ type: 'progress', data: x });
      });

      const processedTexts = text.map((t, index) => {
        if (isQuery) {
          return QUERY_PREFIX + t;
        }
        return t;
      });

      const embeddings = await extractor(processedTexts, {
        pooling: "cls",
        normalize: true,
      });

      // Send batch results back
      self.postMessage({
        type: 'batch_complete',
        id,
        embeddings: embeddings.tolist()
      });
    } catch (error) {
      self.postMessage({
        type: 'batch_error',
        id,
        error: error.message
      });
    }
    return;
  }

  // Handle single requests with queue
  if (id) {
    requestQueue.set(id, { source, text, isQuery });
    
    if (!isProcessing) {
      processQueue();
    }
    return;
  }

  // Legacy support for original format
  try {
    const extractor = await MyFeatureExtractionPipeline.getInstance((x) => {
      self.postMessage(x);
    });

    let processedText;
    if (isQuery) {
      processedText = QUERY_PREFIX + source;
    } else {
      processedText = Array.isArray(text) ? text : [text];
    }

    const embeddings = await extractor(processedText, {
      pooling: "cls",
      normalize: true,
    });

    self.postMessage({
      status: "complete",
      embeddings: embeddings.tolist()
    });
  } catch (error) {
    self.postMessage({
      status: "error",
      error: error.message
    });
  }
});

async function processQueue() {
  if (isProcessing || requestQueue.size === 0) return;
  
  isProcessing = true;
  
  try {
    const extractor = await MyFeatureExtractionPipeline.getInstance();
    
    // Process requests in batches for efficiency
    const batchSize = 5;
    const entries = Array.from(requestQueue.entries());
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const batchTexts = batch.map(([_, { source, text, isQuery }]) => {
        const textToProcess = text || source;
        return isQuery ? QUERY_PREFIX + textToProcess : textToProcess;
      });
      
      const embeddings = await extractor(batchTexts, {
        pooling: "cls",
        normalize: true,
      });
      
      const embeddingList = embeddings.tolist();
      
      // Send individual responses
      batch.forEach(([id], index) => {
        self.postMessage({
          type: 'complete',
          id,
          embedding: embeddingList[index]
        });
        requestQueue.delete(id);
      });
    }
  } catch (error) {
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
