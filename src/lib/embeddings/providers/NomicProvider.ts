
import { BaseEmbeddingProvider, EmbeddingOptions } from './EmbeddingProvider';

export class NomicProvider extends BaseEmbeddingProvider {
  readonly name = 'Nomic Embed Text v1.5';
  readonly dimension = 768;
  readonly maxBatchSize = 10;

  private worker: Worker | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (value: number[][]) => void; reject: (error: Error) => void }>();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[Nomic Provider] Initializing with Nomic Embed Text v1.5 model');
      
      // Create dedicated worker for Nomic model
      this.worker = new Worker(new URL('../nomicWorker.ts', import.meta.url), {
        type: 'module'
      });

      // Set up message handling
      this.worker.onmessage = (event) => {
        const { type, id, embeddings, error } = event.data;
        
        if (type === 'progress') {
          console.log('[Nomic Provider] Loading progress:', event.data.data);
          return;
        }

        const request = this.pendingRequests.get(id);
        if (!request) return;

        this.pendingRequests.delete(id);

        if (type === 'complete') {
          request.resolve(embeddings);
        } else if (type === 'error') {
          request.reject(new Error(error || 'Unknown embedding generation error'));
        }
      };

      this.worker.onerror = (error) => {
        console.error('[Nomic Provider] Worker error:', error);
        // Reject all pending requests
        for (const request of this.pendingRequests.values()) {
          request.reject(new Error('Worker encountered an error'));
        }
        this.pendingRequests.clear();
      };

      // Initialize the model in the worker
      await this.initializeWorker();
      
      this.isInitialized = true;
      console.log('[Nomic Provider] Initialization complete');
    } catch (error) {
      console.error('[Nomic Provider] Failed to initialize:', error);
      throw error;
    }
  }

  private async initializeWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 60000); // 1 minute timeout

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'ready') {
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', handleMessage);
          resolve();
        } else if (event.data.type === 'error') {
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', handleMessage);
          reject(new Error(event.data.error));
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({ type: 'initialize' });
    });
  }

  async generateEmbeddings(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    if (!this.isInitialized || !this.worker) {
      throw new Error('Nomic Provider not initialized');
    }

    if (texts.length === 0) {
      return [];
    }

    console.log(`[Nomic Provider] Generating embeddings for ${texts.length} texts`);

    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      
      this.pendingRequests.set(id, { resolve, reject });

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Embedding generation timeout'));
        }
      }, 30000); // 30 second timeout

      this.worker!.postMessage({
        type: 'generate',
        id,
        texts,
        options
      });
    });
  }

  dispose(): void {
    console.log('[Nomic Provider] Disposing resources');
    
    // Reject all pending requests
    for (const request of this.pendingRequests.values()) {
      request.reject(new Error('Provider disposed'));
    }
    this.pendingRequests.clear();

    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    super.dispose();
  }
}
