
import { pipeline, Pipeline } from '@huggingface/transformers';

export interface NEREntity {
  value: string;
  type: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface NERResult {
  entities: NEREntity[];
  totalCount: number;
  entityTypes: Record<string, number>;
  processingTime?: number;
  textLength?: number;
}

export interface NERStatus {
  isInitialized: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  modelId?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

// Only SmolLM2 model now
export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'eduardoworrel/SmolLM2-135M',
    name: 'SmolLM2-135M',
    description: 'Lightweight language model for text analysis'
  }
];

/**
 * HuggingFace Transformers NER Service
 */
class NERService {
  private pipeline: Pipeline | null = null;
  private currentModelId: string = AVAILABLE_MODELS[0].id;
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';

  constructor() {
    console.log('[NERService] Service initialized with SmolLM2');
    this.initializePipeline();
  }

  private async initializePipeline() {
    if (this.loading) {
      console.log('[NERService] Already loading');
      return;
    }
    
    this.loading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.initialized = false;

    try {
      console.log('[NERService] Loading SmolLM2 model...');
      
      // Create text generation pipeline for SmolLM2
      this.pipeline = await pipeline('text-generation', this.currentModelId, {
        device: 'webgpu',
        dtype: 'fp32',
      });
      
      this.initialized = true;
      console.log('[NERService] SmolLM2 model loaded successfully');
    } catch (error) {
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error during initialization';
      console.error('[NERService] Failed to load SmolLM2:', error);
      this.initialized = false;
    } finally {
      this.loading = false;
    }
  }

  public async extractEntities(text: string): Promise<NERResult> {
    const startTime = Date.now();
    
    console.log('[NERService] Starting entity extraction with SmolLM2');
    console.log('[NERService] Input text length:', text?.length || 0);

    // Validate input
    if (!text?.trim()) {
      console.warn('[NERService] Empty or invalid text input');
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: 0
      };
    }

    // Ensure model is loaded
    if (!this.initialized) {
      await this.initializePipeline();
    }

    if (!this.initialized || !this.pipeline) {
      console.error('[NERService] SmolLM2 not properly initialized');
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: text.length
      };
    }

    try {
      console.log('[NERService] Using SmolLM2 for text analysis...');
      
      // Use SmolLM2 to analyze text and extract potential entities
      const prompt = `Analyze the following text and identify named entities (people, places, organizations, dates, etc.):\n\n${text}\n\nEntities:`;
      
      const result = await this.pipeline(prompt, {
        max_new_tokens: 200,
        temperature: 0.1,
        do_sample: true,
      });

      // Parse the model's response to extract entities
      // This is a simplified approach - in production you might want more sophisticated parsing
      const entities = this.parseEntitiesFromResponse(result[0]?.generated_text || '', text);
      
      const entityTypes = entities.reduce((acc, entity) => {
        acc[entity.type] = (acc[entity.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const processingTime = Date.now() - startTime;
      console.log(`[NERService] SmolLM2 analysis completed in ${processingTime}ms`);
      console.log(`[NERService] Found ${entities.length} entities:`, entities);

      return {
        entities,
        totalCount: entities.length,
        entityTypes,
        processingTime,
        textLength: text.length
      };
    } catch (error) {
      console.error('[NERService] SmolLM2 inference error:', error);
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'Inference failed';
      
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: text.length
      };
    }
  }

  private parseEntitiesFromResponse(response: string, originalText: string): NEREntity[] {
    const entities: NEREntity[] = [];
    
    // Simple parsing logic - look for common entity patterns in the response
    const lines = response.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes(':') && (trimmed.includes('Person') || trimmed.includes('Place') || trimmed.includes('Organization'))) {
        const parts = trimmed.split(':');
        if (parts.length >= 2) {
          const type = parts[0].trim().toUpperCase();
          const value = parts[1].trim();
          
          // Find the entity in the original text
          const start = originalText.toLowerCase().indexOf(value.toLowerCase());
          if (start !== -1) {
            entities.push({
              value,
              type,
              start,
              end: start + value.length,
              confidence: 0.8
            });
          }
        }
      }
    }
    
    return entities;
  }

  public async switchModel(modelId: string): Promise<void> {
    console.log('[NERService] Switching to model:', modelId);
    
    if (modelId !== AVAILABLE_MODELS[0].id) {
      throw new Error(`Unknown model: ${modelId}. Only ${AVAILABLE_MODELS[0].id} is supported.`);
    }

    this.currentModelId = modelId;
    this.pipeline = null;
    await this.initializePipeline();
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
    console.log('[NERService] Force reinitializing SmolLM2...');
    this.initialized = false;
    this.loading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.pipeline = null;
    await this.initializePipeline();
  }

  public getAvailableModels(): ModelInfo[] {
    return AVAILABLE_MODELS;
  }
}

// Export singleton instance
export const nerService = new NERService();
