
import { NEREntity } from '../nerServiceManager';
import { NERAPIClient, APIResponse } from './index';

export interface GeminiNERResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiAPIClient implements NERAPIClient {
  private apiKey: string | null = null;
  private currentModelId: string = 'gemini-2.5-flash';
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';

  constructor(modelId?: string) {
    console.log('[GeminiAPIClient] API client initialized');
    if (modelId) {
      this.currentModelId = modelId;
    }
    this.initialize();
  }

  private initialize(): void {
    this.apiKey = localStorage.getItem('gemini_api_key');
    
    if (this.apiKey) {
      this.initialized = true;
      this.hasError = false;
      this.errorMessage = '';
      console.log('[GeminiAPIClient] API key found, client ready');
    } else {
      this.hasError = true;
      this.errorMessage = 'Gemini API key not found. Please configure it in the API settings.';
      console.warn('[GeminiAPIClient] API key not found');
    }
  }

  public isConfigured(): boolean {
    return this.initialized && !!this.apiKey;
  }

  public async extractEntities(text: string, prompt: string, schema: any): Promise<NEREntity[]> {
    console.log('[GeminiAPIClient] Making API call to:', this.currentModelId);
    
    if (!this.isConfigured()) {
      this.initialize();
      if (!this.isConfigured()) {
        console.error('[GeminiAPIClient] Not properly configured');
        return [];
      }
    }

    this.loading = true;
    this.hasError = false;
    this.errorMessage = '';

    try {
      const response = await fetch(`${this.baseUrl}${this.currentModelId}:generateContent`, {
        method: 'POST',
        headers: {
          'x-goog-api-key': this.apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: schema.items.properties,
                required: schema.items.required
              }
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data: GeminiNERResponse = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error('[GeminiAPIClient] API error:', error);
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'API request failed';
      return [];
    } finally {
      this.loading = false;
    }
  }

  private parseResponse(response: GeminiNERResponse): NEREntity[] {
    try {
      if (!response.candidates || response.candidates.length === 0) {
        console.warn('[GeminiAPIClient] No candidates in response');
        return [];
      }

      const content = response.candidates[0]?.content?.parts?.[0]?.text;
      if (!content) {
        console.warn('[GeminiAPIClient] No content in response');
        return [];
      }

      return JSON.parse(content) as NEREntity[];
    } catch (error) {
      console.error('[GeminiAPIClient] Failed to parse response:', error);
      return [];
    }
  }

  public async reinitialize(): Promise<void> {
    console.log('[GeminiAPIClient] Reinitializing...');
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
    console.log('[GeminiAPIClient] Switching to model:', modelId);
    this.currentModelId = modelId;
  }
}
