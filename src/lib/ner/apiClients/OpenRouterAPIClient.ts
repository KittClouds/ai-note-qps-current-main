
import { NEREntity } from '../nerServiceManager';
import { NERAPIClient, APIResponse } from './index';

export interface OpenRouterNERResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class OpenRouterAPIClient implements NERAPIClient {
  private apiKey: string | null = null;
  private currentModelId: string = 'minimax/minimax-m1:extended';
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(modelId?: string) {
    console.log('[OpenRouterAPIClient] API client initialized');
    if (modelId) {
      this.currentModelId = modelId;
    }
    this.initialize();
  }

  public initialize(): void {
    this.apiKey = localStorage.getItem('openrouter_api_key');
    
    if (this.apiKey) {
      this.initialized = true;
      this.hasError = false;
      this.errorMessage = '';
      console.log('[OpenRouterAPIClient] API key found, client ready');
    } else {
      this.hasError = true;
      this.errorMessage = 'OpenRouter API key not found. Please configure it in API settings.';
      console.warn('[OpenRouterAPIClient] API key not found');
    }
  }

  public isConfigured(): boolean {
    return this.initialized && !!this.apiKey;
  }

  public async extractEntities(text: string, prompt: string, schema: any): Promise<NEREntity[]> {
    console.log('[OpenRouterAPIClient] Making API call to:', this.currentModelId);
    
    if (!this.isConfigured()) {
      this.initialize();
      if (!this.isConfigured()) {
        console.error('[OpenRouterAPIClient] Not properly configured');
        return [];
      }
    }

    this.loading = true;
    this.hasError = false;
    this.errorMessage = '';

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModelId,
          messages: [
            { role: 'user', content: prompt }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'ner_entities',
              strict: true,
              schema: schema
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenRouterNERResponse = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error('[OpenRouterAPIClient] API error:', error);
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'API request failed';
      return [];
    } finally {
      this.loading = false;
    }
  }

  private parseResponse(response: OpenRouterNERResponse): NEREntity[] {
    try {
      if (!response.choices || response.choices.length === 0) {
        console.warn('[OpenRouterAPIClient] No choices in response');
        return [];
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn('[OpenRouterAPIClient] No content in response');
        return [];
      }

      return JSON.parse(content) as NEREntity[];
    } catch (error) {
      console.error('[OpenRouterAPIClient] Failed to parse response:', error);
      return [];
    }
  }

  public async reinitialize(): Promise<void> {
    console.log('[OpenRouterAPIClient] Reinitializing...');
    this.initialized = false;
    this.loading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.initialize();
  }

  public getStatus() {
    return {
      isInitialized: this.initialized,
      isLoading: this.loading,
      hasError: this.hasError,
      errorMessage: this.errorMessage
    };
  }

  public switchModel(modelId: string): void {
    console.log('[OpenRouterAPIClient] Switching to model:', modelId);
    this.currentModelId = modelId;
  }
}
