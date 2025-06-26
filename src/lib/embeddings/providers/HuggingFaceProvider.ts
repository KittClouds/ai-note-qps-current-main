
import { BaseEmbeddingProvider, EmbeddingOptions } from './EmbeddingProvider';

export class HuggingFaceProvider extends BaseEmbeddingProvider {
  readonly name = 'HuggingFace Snowflake Arctic';
  readonly dimension = 384;
  readonly maxBatchSize = 10;
  
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  private requestId = 0;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.worker = new Worker(
        new URL('../embeddingsWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event) => {
        const { status, embeddings, error } = event.data;
        
        if (status === 'complete' || status === 'error') {
          const requestKey = `${this.requestId - 1}`;
          const pendingRequest = this.pendingRequests.get(requestKey);
          
          if (pendingRequest) {
            if (status === 'complete') {
              pendingRequest.resolve(embeddings);
            } else {
              pendingRequest.reject(new Error(error));
            }
            this.pendingRequests.delete(requestKey);
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error('HuggingFace embeddings worker error:', error);
      };

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize HuggingFace provider:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    if (!this.worker) {
      throw new Error('HuggingFace provider not initialized');
    }

    const requestKey = `${this.requestId++}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestKey, { resolve, reject });
      
      this.worker!.postMessage({
        source: Array.isArray(texts) ? texts.join(' ') : texts[0],
        text: texts,
        isQuery: options.isQuery || false
      });
    });
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
    super.dispose();
  }
}
