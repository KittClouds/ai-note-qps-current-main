
import { pipeline, env } from '@huggingface/transformers';

// Type declarations
export interface NEREntity {
  value: string;   // surface text
  type: string;    // predicted label
  start: number;   // char start
  end: number;     // char end
  confidence?: number; // confidence score
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

// Try different models in order of preference
const MODEL_OPTIONS = [
  'onnx-community/gliner_small-v2.1',
  'Xenova/bert-base-NER',
  'Xenova/distilbert-base-cased-finetuned-conll03-english'
];

type CandidateLabels = string[];
type DeviceType = 'webgpu' | 'wasm' | 'cpu';

// Default entity labels for GLiNER
const DEFAULT_LABELS: CandidateLabels = [
  'PERSON',
  'ORGANIZATION', 
  'LOCATION',
  'DATE',
  'MONEY',
  'PRODUCT',
  'EVENT',
  'WORK_OF_ART',
  'LAW',
  'LANGUAGE'
];

/**
 * Enhanced NER Service with better error handling and debugging
 */
class NERService {
  private classifier: any = null;
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';
  private currentModelId = '';

  constructor() {
    console.log('[NER] Service initialized');
  }

  private async tryInitializeModel(modelId: string, deviceOptions: DeviceType[]): Promise<boolean> {
    for (const device of deviceOptions) {
      try {
        console.log(`[NER] Attempting to load model ${modelId} on device: ${device}`);
        
        const startTime = Date.now();
        this.classifier = await pipeline('token-classification', modelId, { device });
        const loadTime = Date.now() - startTime;
        
        console.log(`[NER] Successfully loaded model ${modelId} on ${device} in ${loadTime}ms`);
        this.currentModelId = modelId;
        return true;
      } catch (err) {
        console.warn(`[NER] Failed to load ${modelId} on ${device}:`, err);
        continue;
      }
    }
    return false;
  }

  private async init() {
    if (this.initialized || this.loading) {
      console.log('[NER] Already initialized or loading');
      return;
    }
    
    this.loading = true;
    this.hasError = false;
    this.errorMessage = '';

    try {
      console.log('[NER] Starting initialization...');
      
      // Configure environment for better performance
      env.backends.onnx.wasm.numThreads = Math.min(navigator.hardwareConcurrency ?? 4, 4);
      
      // Device preference order: webgpu -> wasm -> cpu
      const deviceOptions: DeviceType[] = ['webgpu', 'wasm', 'cpu'];
      
      // Try each model until one works
      let modelLoaded = false;
      for (const modelId of MODEL_OPTIONS) {
        console.log(`[NER] Trying model: ${modelId}`);
        if (await this.tryInitializeModel(modelId, deviceOptions)) {
          modelLoaded = true;
          break;
        }
      }
      
      if (!modelLoaded) {
        throw new Error('Failed to load any NER model');
      }

      this.initialized = true;
      console.log(`[NER] Service ready with model: ${this.currentModelId}`);
    } catch (err) {
      this.hasError = true;
      this.errorMessage = err instanceof Error ? err.message : 'Unknown error during initialization';
      console.error('[NER] Initialization failed:', err);
      this.initialized = false;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Extract entities with comprehensive error handling and debugging
   */
  public async extractEntities(
    text: string,
    labels: CandidateLabels = DEFAULT_LABELS
  ): Promise<NERResult> {
    const startTime = Date.now();
    
    console.log('[NER] Starting entity extraction');
    console.log('[NER] Input text length:', text?.length || 0);
    console.log('[NER] Input text preview:', text?.substring(0, 100) + '...');
    
    // Validate input
    if (!text?.trim()) {
      console.warn('[NER] Empty or invalid text input');
      return { 
        entities: [], 
        totalCount: 0, 
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: 0
      };
    }

    // Ensure model is loaded
    await this.init();
    
    if (!this.initialized || !this.classifier) {
      console.error('[NER] Service not properly initialized');
      return { 
        entities: [], 
        totalCount: 0, 
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: text.length
      };
    }

    try {
      console.log('[NER] Running inference...');
      
      // For standard NER models, we don't need the labels parameter
      const inferenceInput = this.currentModelId.includes('gliner') 
        ? { text, labels } // GLiNER-style input
        : text; // Standard token classification input
      
      const raw = await this.classifier(inferenceInput);
      console.log('[NER] Raw inference result:', raw);

      const entities: NEREntity[] = [];
      const entityTypes: Record<string, number> = {};

      if (Array.isArray(raw)) {
        for (const r of raw) {
          // Handle different model output formats
          const entity: NEREntity = {
            value: r.word || r.entity_group || r.text || '',
            type: r.entity || r.entity_group || r.label || 'UNKNOWN',
            start: r.start || 0,
            end: r.end || 0,
            confidence: r.score || r.confidence
          };
          
          // Filter out low-confidence or invalid entities
          if (entity.value && entity.type && (entity.confidence || 0) > 0.5) {
            entities.push(entity);
            entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
          }
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`[NER] Extraction completed in ${processingTime}ms`);
      console.log(`[NER] Found ${entities.length} entities:`, entities);

      return {
        entities,
        totalCount: entities.length,
        entityTypes,
        processingTime,
        textLength: text.length
      };
    } catch (err) {
      console.error('[NER] Inference error:', err);
      this.hasError = true;
      this.errorMessage = err instanceof Error ? err.message : 'Inference failed';
      
      return { 
        entities: [], 
        totalCount: 0, 
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: text.length
      };
    }
  }

  // Public status methods
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

  // Force reinitialize
  public async reinitialize(): Promise<void> {
    console.log('[NER] Force reinitializing...');
    this.initialized = false;
    this.loading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.classifier = null;
    this.currentModelId = '';
    await this.init();
  }
}

// Export singleton instance
export const nerService = new NERService();
export type { CandidateLabels };
