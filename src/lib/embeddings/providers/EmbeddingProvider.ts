
export interface EmbeddingProvider {
  readonly name: string;
  readonly dimension: number;
  readonly maxBatchSize: number;
  
  initialize(): Promise<void>;
  generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<number[][]>;
  dispose(): void;
}

export interface EmbeddingOptions {
  isQuery?: boolean;
  taskType?: string;
  batchSize?: number;
}

export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  abstract readonly name: string;
  abstract readonly dimension: number;
  abstract readonly maxBatchSize: number;
  
  protected isInitialized = false;
  
  abstract initialize(): Promise<void>;
  abstract generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<number[][]>;
  
  dispose(): void {
    this.isInitialized = false;
  }
}
