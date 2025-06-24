
import { pipeline } from '@huggingface/transformers';
import { NERWorkerMessage, NERWorkerResponse, NERSpan } from '../lib/ner/types';

class MyNERPipeline {
  static task = 'token-classification' as const;
  static model = 'onnx-community/gliner_small-v2.1';
  static instance: MyNERPipeline | null = null;

  private pipeline: any = null;
  private isLoading = false;

  static async getInstance(progress_callback?: (progress: any) => void): Promise<MyNERPipeline> {
    if (this.instance === null) {
      this.instance = new MyNERPipeline();
    }
    return this.instance.load(progress_callback);
  }

  private async load(progress_callback?: (progress: any) => void): Promise<MyNERPipeline> {
    if (this.pipeline) return this;
    if (this.isLoading) {
      // Wait for loading to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this;
    }

    try {
      this.isLoading = true;
      this.pipeline = await pipeline(
        MyNERPipeline.task,
        MyNERPipeline.model,
        { 
          progress_callback,
          device: 'webgpu'
        }
      );
    } catch (error) {
      console.error('Failed to load NER pipeline:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }

    return this;
  }

  async analyse(text: string, labels: string[] = ['PERSON', 'ORG', 'LOC', 'MISC']): Promise<NERSpan[]> {
    if (!this.pipeline) {
      throw new Error('Pipeline not loaded');
    }

    try {
      const result = await this.pipeline(text, {
        labels: labels,
        threshold: 0.3
      });

      // Convert result to NERSpan format
      const spans: NERSpan[] = [];
      if (Array.isArray(result)) {
        result.forEach((entity: any) => {
          if (entity.start !== undefined && entity.end !== undefined) {
            spans.push({
              start: entity.start,
              end: entity.end,
              label: entity.label || entity.entity_group || 'UNKNOWN',
              score: entity.score || entity.confidence || 0
            });
          }
        });
      }

      return spans;
    } catch (error) {
      console.error('NER analysis failed:', error);
      throw error;
    }
  }
}

// Request queue for batching
const requestQueue: NERWorkerMessage[] = [];
const batchSize = 5;
const batchTimeout = 100;
let batchTimer: NodeJS.Timeout | null = null;

async function processBatch() {
  if (requestQueue.length === 0) return;

  const batch = requestQueue.splice(0, batchSize);
  
  try {
    const pipeline = await MyNERPipeline.getInstance((progress) => {
      self.postMessage({
        type: 'progress',
        progress: progress.progress || 0
      } as NERWorkerResponse);
    });

    for (const request of batch) {
      try {
        const spans = await pipeline.analyse(request.text, request.labels);
        self.postMessage({
          type: 'complete',
          id: request.id,
          spans
        } as NERWorkerResponse);
      } catch (error) {
        self.postMessage({
          type: 'error',
          id: request.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as NERWorkerResponse);
      }
    }
  } catch (error) {
    // Send error to all requests in batch
    batch.forEach(request => {
      self.postMessage({
        type: 'error',
        id: request.id,
        error: error instanceof Error ? error.message : 'Pipeline initialization failed'
      } as NERWorkerResponse);
    });
  }
}

function scheduleBatch() {
  if (batchTimer) {
    clearTimeout(batchTimer);
  }
  batchTimer = setTimeout(processBatch, batchTimeout);
}

self.addEventListener('message', async (event) => {
  const message = event.data as NERWorkerMessage;

  if (message.batch) {
    // Add to queue for batch processing
    requestQueue.push(message);
    
    if (requestQueue.length >= batchSize) {
      // Process immediately if batch is full
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
      await processBatch();
    } else {
      // Schedule batch processing
      scheduleBatch();
    }
  } else {
    // Process immediately for single requests
    try {
      const pipeline = await MyNERPipeline.getInstance((progress) => {
        self.postMessage({
          type: 'progress',
          progress: progress.progress || 0
        } as NERWorkerResponse);
      });

      const spans = await pipeline.analyse(message.text, message.labels);
      self.postMessage({
        type: 'complete',
        id: message.id,
        spans
      } as NERWorkerResponse);
    } catch (error) {
      self.postMessage({
        type: 'error',
        id: message.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as NERWorkerResponse);
    }
  }
});
