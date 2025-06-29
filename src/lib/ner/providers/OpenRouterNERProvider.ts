
import { NEREntity, NERResult, NERStatus } from '../nerServiceManager';

export interface OpenRouterNERResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  description: string;
}

export const OPENROUTER_NER_MODELS: OpenRouterModelInfo[] = [
  {
    id: 'minimax/minimax-m1:extended',
    name: 'Minimax M1 Extended',
    description: 'Advanced NER with structured outputs'
  }
];

export class OpenRouterNERProvider {
  private apiKey: string | null = null;
  private currentModelId: string = OPENROUTER_NER_MODELS[0].id;
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    console.log('[OpenRouterNER] Provider initialized');
    this.initialize();
  }

  private initialize(): void {
    this.apiKey = localStorage.getItem('openrouter_api_key');
    
    if (this.apiKey) {
      this.initialized = true;
      this.hasError = false;
      this.errorMessage = '';
      console.log('[OpenRouterNER] API key found, provider ready');
    } else {
      this.hasError = true;
      this.errorMessage = 'OpenRouter API key not found. Please configure it in API settings.';
      console.warn('[OpenRouterNER] API key not found');
    }
  }

  public async extractEntities(text: string): Promise<NERResult> {
    const startTime = Date.now();
    
    console.log('[OpenRouterNER] Starting entity extraction');
    console.log('[OpenRouterNER] Input text length:', text?.length || 0);

    if (!text?.trim()) {
      console.warn('[OpenRouterNER] Empty or invalid text input');
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: 0
      };
    }

    if (!this.initialized || !this.apiKey) {
      this.initialize();
      
      if (!this.initialized || !this.apiKey) {
        console.error('[OpenRouterNER] Not properly initialized');
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
      console.log('[OpenRouterNER] Making API call to:', this.currentModelId);
      
      const prompt = `Extract named entities from the following text. Analyze and identify entities with their exact positions.

Text: "${text}"

Return entities in JSON format with the following structure for each entity:
- value: the exact text as it appears
- type: entity type (PERSON, ORG, GPE, LOC, DATE, TIME, MONEY, PERCENT, CARDINAL, ORDINAL, EVENT, FAC, PRODUCT, WORK_OF_ART, LAW, LANGUAGE, NORP, QUANTITY)
- start: character position where entity starts
- end: character position where entity ends
- confidence: confidence level (0.0 to 1.0)`;

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
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    value: {
                      type: 'string',
                      description: 'The exact text of the entity'
                    },
                    type: {
                      type: 'string',
                      description: 'The entity type'
                    },
                    start: {
                      type: 'integer',
                      description: 'Start position in text'
                    },
                    end: {
                      type: 'integer',
                      description: 'End position in text'
                    },
                    confidence: {
                      type: 'number',
                      description: 'Confidence score between 0 and 1'
                    }
                  },
                  required: ['value', 'type', 'start', 'end', 'confidence'],
                  additionalProperties: false
                }
              }
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenRouterNERResponse = await response.json();
      const entities = this.parseEntitiesFromResponse(data, text);
      
      const uniqueEntities = this.removeDuplicateEntities(entities);
      
      const entityTypes = uniqueEntities.reduce((acc, entity) => {
        acc[entity.type] = (acc[entity.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const processingTime = Date.now() - startTime;
      console.log(`[OpenRouterNER] Analysis completed in ${processingTime}ms`);
      console.log(`[OpenRouterNER] Found ${uniqueEntities.length} unique entities:`, uniqueEntities);

      return {
        entities: uniqueEntities,
        totalCount: uniqueEntities.length,
        entityTypes,
        processingTime,
        textLength: text.length
      };
    } catch (error) {
      console.error('[OpenRouterNER] API error:', error);
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

  private parseEntitiesFromResponse(response: OpenRouterNERResponse, originalText: string): NEREntity[] {
    try {
      if (!response.choices || response.choices.length === 0) {
        console.warn('[OpenRouterNER] No choices in response');
        return [];
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn('[OpenRouterNER] No content in response');
        return [];
      }

      const entities = JSON.parse(content) as NEREntity[];
      
      return entities.filter(entity => {
        const isValid = entity.value && 
                       entity.type && 
                       typeof entity.start === 'number' && 
                       typeof entity.end === 'number' &&
                       entity.start >= 0 && 
                       entity.end <= originalText.length &&
                       entity.start < entity.end;
        
        if (!isValid) {
          console.warn('[OpenRouterNER] Invalid entity filtered out:', entity);
        }
        
        return isValid;
      });
    } catch (error) {
      console.error('[OpenRouterNER] Failed to parse response:', error);
      return [];
    }
  }

  private removeDuplicateEntities(entities: NEREntity[]): NEREntity[] {
    const seen = new Set<string>();
    return entities.filter(entity => {
      const key = `${entity.value}-${entity.type}-${entity.start}-${entity.end}`;
      if (seen.has(key)) {
        console.log('[OpenRouterNER] Removing duplicate entity:', entity);
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  public async switchModel(modelId: string): Promise<void> {
    console.log('[OpenRouterNER] Switching to model:', modelId);
    
    const targetModel = OPENROUTER_NER_MODELS.find(model => model.id === modelId);
    if (!targetModel) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    this.currentModelId = modelId;
    console.log('[OpenRouterNER] Model switched successfully');
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
    console.log('[OpenRouterNER] Reinitializing...');
    this.initialized = false;
    this.loading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.initialize();
  }

  public getAvailableModels(): OpenRouterModelInfo[] {
    return OPENROUTER_NER_MODELS;
  }

  public getCurrentModel(): OpenRouterModelInfo | null {
    return OPENROUTER_NER_MODELS.find(model => model.id === this.currentModelId) || null;
  }
}

export const openRouterNERProvider = new OpenRouterNERProvider();
