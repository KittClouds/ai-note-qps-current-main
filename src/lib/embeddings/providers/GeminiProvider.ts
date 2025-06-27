
import { BaseEmbeddingProvider, EmbeddingOptions } from './EmbeddingProvider';

export interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

export class GeminiProvider extends BaseEmbeddingProvider {
  readonly name = 'Google Gemini';
  readonly dimension = 3072; // Updated to match actual API response
  readonly maxBatchSize = 5;
  
  private apiKey: string | null = null;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-exp-03-07:embedContent';

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Try to get API key from localStorage
    this.apiKey = localStorage.getItem('gemini_api_key');
    
    if (!this.apiKey) {
      throw new Error('Gemini API key not found. Please set it in the UI.');
    }

    this.isInitialized = true;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    localStorage.setItem('gemini_api_key', apiKey);
    this.isInitialized = true;
  }

  async generateEmbeddings(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not set');
    }

    const taskType = this.getTaskType(options);
    const embeddings: number[][] = [];

    // Process texts in batches
    for (let i = 0; i < texts.length; i += this.maxBatchSize) {
      const batch = texts.slice(i, i + this.maxBatchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.generateSingleEmbedding(text, taskType))
      );
      embeddings.push(...batchResults);
    }

    return embeddings;
  }

  private async generateSingleEmbedding(text: string, taskType: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'models/gemini-embedding-exp-03-07',
        content: {
          parts: [{ text }]
        },
        taskType
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiEmbeddingResponse = await response.json();
    return data.embedding.values;
  }

  private getTaskType(options: EmbeddingOptions): string {
    if (options.taskType) return options.taskType;
    return options.isQuery ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT';
  }
}
