
import { NEREntity } from '../nerServiceManager';

// Common interface for all NER API clients
export interface NERAPIClient {
  isConfigured(): boolean;
  extractEntities(text: string, prompt: string, schema: any): Promise<NEREntity[]>;
  reinitialize(): Promise<void>;
  getStatus(): {
    isInitialized: boolean;
    isLoading: boolean;
    hasError: boolean;
    errorMessage?: string;
  };
}

// API response types
export interface APIResponse {
  success: boolean;
  entities?: NEREntity[];
  error?: string;
}
