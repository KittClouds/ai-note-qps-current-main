import { NEREntity, NERResult, NERStatus } from '../nerServiceManager';

export interface GeminiNERResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface GeminiModelInfo {
  id: string;
  name: string;
  description: string;
}

export const GEMINI_NER_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient NER with high accuracy'
  },
  {
    id: 'gemini-2.5-flash-lite-preview-06-17',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Lightweight version for faster processing'
  }
];

export class GeminiNERProvider {
  private apiKey: string | null = null;
  private currentModelId: string = GEMINI_NER_MODELS[0].id;
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';

  constructor() {
    console.log('[GeminiNER] Provider initialized');
    this.initialize();
  }

  private initialize(): void {
    // Get API key from localStorage (same as embeddings)
    this.apiKey = localStorage.getItem('gemini_api_key');
    
    if (this.apiKey) {
      this.initialized = true;
      this.hasError = false;
      this.errorMessage = '';
      console.log('[GeminiNER] API key found, provider ready');
    } else {
      this.hasError = true;
      this.errorMessage = 'Gemini API key not found. Please configure it in the embedding settings.';
      console.warn('[GeminiNER] API key not found');
    }
  }

  public async extractEntities(text: string): Promise<NERResult> {
    const startTime = Date.now();
    
    console.log('[GeminiNER] Starting entity extraction');
    console.log('[GeminiNER] Input text length:', text?.length || 0);

    // Validate input
    if (!text?.trim()) {
      console.warn('[GeminiNER] Empty or invalid text input');
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: 0
      };
    }

    // Check if initialized
    if (!this.initialized || !this.apiKey) {
      this.initialize();
      
      if (!this.initialized || !this.apiKey) {
        console.error('[GeminiNER] Not properly initialized');
        return {
          entities: [],
          totalCount: 0,
          entityTypes: {},
          processingTime: Date.now() - startTime,
          textLength: text.length
        };
      }
    }

    this.loading = true;
    this.hasError = false;
    this.errorMessage = '';

    try {
      console.log('[GeminiNER] Making API call to:', this.currentModelId);
      
      const prompt = `Analyze the following text and extract named entities. Return only valid entities with their exact positions in the text.

Text: "${text}"

Extract entities of these types:
- PERSON: Names of people
- ORGANIZATION: Companies, institutions, organizations
- LOCATION: Cities, countries, places
- DATE: Dates and times
- MONEY: Monetary amounts
- PERCENTAGE: Percentages
- MISC: Other important entities

For each entity, provide:
- value: the exact text as it appears
- type: one of the types above
- start: character position where entity starts
- end: character position where entity ends
- confidence: your confidence level (0.0 to 1.0)`;

      const response = await fetch(`${this.baseUrl}${this.currentModelId}:generateContent`, {
        method: 'POST',
        headers: {
          'x-goog-api-key': this.apiKey,
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
                properties: {
                  value: { type: 'STRING' },
                  type: { type: 'STRING' },
                  start: { type: 'INTEGER' },
                  end: { type: 'INTEGER' },
                  confidence: { type: 'NUMBER' }
                },
                required: ['value', 'type', 'start', 'end', 'confidence']
              }
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data: GeminiNERResponse = await response.json();
      const entities = this.parseEntitiesFromResponse(data, text);
      
      const entityTypes = entities.reduce((acc, entity) => {
        acc[entity.type] = (acc[entity.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const processingTime = Date.now() - startTime;
      console.log(`[GeminiNER] Analysis completed in ${processingTime}ms`);
      console.log(`[GeminiNER] Found ${entities.length} entities:`, entities);

      return {
        entities,
        totalCount: entities.length,
        entityTypes,
        processingTime,
        textLength: text.length
      };
    } catch (error) {
      console.error('[GeminiNER] API error:', error);
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'API request failed';
      
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: text.length
      };
    } finally {
      this.loading = false;
    }
  }

  private parseEntitiesFromResponse(response: GeminiNERResponse, originalText: string): NEREntity[] {
    try {
      if (!response.candidates || response.candidates.length === 0) {
        console.warn('[GeminiNER] No candidates in response');
        return [];
      }

      const content = response.candidates[0]?.content?.parts?.[0]?.text;
      if (!content) {
        console.warn('[GeminiNER] No content in response');
        return [];
      }

      const entities = JSON.parse(content) as NEREntity[];
      
      // Validate entities
      return entities.filter(entity => {
        const isValid = entity.value && 
                       entity.type && 
                       typeof entity.start === 'number' && 
                       typeof entity.end === 'number' &&
                       entity.start >= 0 && 
                       entity.end <= originalText.length &&
                       entity.start < entity.end;
        
        if (!isValid) {
          console.warn('[GeminiNER] Invalid entity filtered out:', entity);
        }
        
        return isValid;
      });
    } catch (error) {
      console.error('[GeminiNER] Failed to parse response:', error);
      return [];
    }
  }

  public async switchModel(modelId: string): Promise<void> {
    console.log('[GeminiNER] Switching to model:', modelId);
    
    const targetModel = GEMINI_NER_MODELS.find(model => model.id === modelId);
    if (!targetModel) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    this.currentModelId = modelId;
    console.log('[GeminiNER] Model switched successfully');
  }

  public getStatus(): NERStatus {
    return {
      isInitialized: this.initialized,
      isLoading: this.loading,
      hasError: this.hasError,
      errorMessage: this.errorMessage,
      modelId: this.currentModelId
    };
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public hasErrors(): boolean {
    return this.hasError;
  }

  public getErrorMessage(): string {
    return this.errorMessage;
  }

  public async reinitialize(): Promise<void> {
    console.log('[GeminiNER] Reinitializing...');
    this.initialized = false;
    this.loading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.initialize();
  }

  public getAvailableModels(): GeminiModelInfo[] {
    return GEMINI_NER_MODELS;
  }

  public getCurrentModel(): GeminiModelInfo | null {
    return GEMINI_NER_MODELS.find(model => model.id === this.currentModelId) || null;
  }
}

// Export singleton instance
export const geminiNERProvider = new GeminiNERProvider();
