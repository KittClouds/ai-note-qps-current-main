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
  },
  {
    id: 'gemma-3n-e4b-it',
    name: 'Gemma 3N E4B IT',
    description: 'Advanced Gemma model for NER tasks'
  },
  {
    id: 'gemma-3-27b-it',
    name: 'Gemma 3 27B IT',
    description: 'Large Gemma model for high-precision NER'
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
- O: Outside of any named entity (e.g., "the", "is")
- B-CARDINAL: Beginning of a cardinal number (e.g., "1000")
- B-DATE: Beginning of a date (e.g., "January")
- B-EVENT: Beginning of an event (e.g., "Olympics")
- B-FAC: Beginning of a facility (e.g., "Eiffel Tower")
- B-GPE: Beginning of a geopolitical entity (e.g., "Tokyo")
- B-LANGUAGE: Beginning of a language (e.g., "Spanish")
- B-LAW: Beginning of a law or legal document (e.g., "Constitution")
- B-LOC: Beginning of a non-GPE location (e.g., "Pacific Ocean")
- B-MONEY: Beginning of a monetary value (e.g., "$100")
- B-NORP: Beginning of a nationality/religious/political group (e.g., "Democrat")
- B-ORDINAL: Beginning of an ordinal number (e.g., "first")
- B-ORG: Beginning of an organization (e.g., "Microsoft")
- B-PERCENT: Beginning of a percentage (e.g., "50%")
- B-PERSON: Beginning of a person's name (e.g., "Elon Musk")
- B-PRODUCT: Beginning of a product (e.g., "iPhone")
- B-QUANTITY: Beginning of a quantity (e.g., "two liters")
- B-TIME: Beginning of a time (e.g., "noon")
- B-WORK_OF_ART: Beginning of a work of art (e.g., "Mona Lisa")
- I-CARDINAL: Inside of a cardinal number (e.g., "000" in "1000")
- I-DATE: Inside of a date (e.g., "2025" in "January 2025")
- I-EVENT: Inside of an event name
- I-FAC: Inside of a facility name
- I-GPE: Inside of a geopolitical entity
- I-LANGUAGE: Inside of a language name
- I-LAW: Inside of a legal document title
- I-LOC: Inside of a location
- I-MONEY: Inside of a monetary value
- I-NORP: Inside of a NORP entity
- I-ORDINAL: Inside of an ordinal number
- I-ORG: Inside of an organization name
- I-PERCENT: Inside of a percentage
- I-PERSON: Inside of a person's name
- I-PRODUCT: Inside of a product name
- I-QUANTITY: Inside of a quantity
- I-TIME: Inside of a time phrase
- I-WORK_OF_ART: Inside of a work of art title

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
      
      // Remove duplicates based on value, type, start, and end positions
      const uniqueEntities = this.removeDuplicateEntities(entities);
      
      const entityTypes = uniqueEntities.reduce((acc, entity) => {
        acc[entity.type] = (acc[entity.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const processingTime = Date.now() - startTime;
      console.log(`[GeminiNER] Analysis completed in ${processingTime}ms`);
      console.log(`[GeminiNER] Found ${uniqueEntities.length} unique entities:`, uniqueEntities);

      return {
        entities: uniqueEntities,
        totalCount: uniqueEntities.length,
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

  private removeDuplicateEntities(entities: NEREntity[]): NEREntity[] {
    const seen = new Set<string>();
    return entities.filter(entity => {
      const key = `${entity.value}-${entity.type}-${entity.start}-${entity.end}`;
      if (seen.has(key)) {
        console.log('[GeminiNER] Removing duplicate entity:', entity);
        return false;
      }
      seen.add(key);
      return true;
    });
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
