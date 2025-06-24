
import { NERSpan, NERWorkerMessage, NERWorkerResponse, NERRequest } from './types';

class NERService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, NERRequest>();
  private requestId = 0;
  private isInitialized = false;

  private async initializeWorker(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamically import the worker
      const NERWorker = (await import('../../workers/ner.worker?worker')).default;
      this.worker = new NERWorker();
      
      this.worker.onmessage = (event) => {
        const response = event.data as NERWorkerResponse;
        
        if (response.type === 'progress') {
          // Handle progress updates (could be used for UI feedback)
          console.log('NER Loading progress:', response.progress);
          return;
        }

        if (response.id && this.pendingRequests.has(response.id)) {
          const request = this.pendingRequests.get(response.id)!;
          this.pendingRequests.delete(response.id);

          if (response.type === 'complete' && response.spans) {
            request.resolve(response.spans);
          } else if (response.type === 'error') {
            request.reject(new Error(response.error || 'Unknown NER error'));
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error('NER Worker error:', error);
        // Reject all pending requests
        this.pendingRequests.forEach(request => {
          request.reject(new Error('Worker error'));
        });
        this.pendingRequests.clear();
        this.restartWorker();
      };

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize NER worker:', error);
      throw error;
    }
  }

  private async restartWorker(): Promise<void> {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    await this.initializeWorker();
  }

  async analyse(text: string, labels?: string[]): Promise<NERSpan[]> {
    if (!text.trim()) {
      return [];
    }

    await this.initializeWorker();

    if (!this.worker) {
      throw new Error('Failed to initialize NER worker');
    }

    const id = (++this.requestId).toString();
    const defaultLabels = ['PERSON', 'ORG', 'LOC', 'MISC'];

    return new Promise<NERSpan[]>((resolve, reject) => {
      const request: NERRequest = {
        id,
        text,
        labels: labels || defaultLabels,
        resolve,
        reject
      };

      this.pendingRequests.set(id, request);

      const message: NERWorkerMessage = {
        id,
        text,
        labels: labels || defaultLabels
      };

      this.worker!.postMessage(message);

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('NER request timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const nerService = new NERService();
