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

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

// Available models with metadata
export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'onnx-community/NeuroBERT-NER-ONNX',
    name: 'NeuroBERT NER',
    description: 'NeuroBERT optimized for NER tasks'
  }
];

type CandidateLabels = string[];
type DeviceType = 'webgpu' | 'wasm' | 'cpu';

// Default entity labels for NeuroBERT
const DEFAULT_LABELS: CandidateLabels = [
  'PERSON',
  'CARDINAL',
  'DATE',
  'EVENT',
  'FAC',
  'GPE',
  'LANGUAGE',
  'LAW',
  'LOC',
  'MONEY',
  'NORP',
  'ORDINAL',
  'ORG',
  'PERCENT',
  'PRODUCT',
  'QUANTITY',
  'TIME',
  'WORK_OF_ART'
];

/**
 * Enhanced NER Service with model selection support
 */
class NERService {
  private classifier: any = null;
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';
  private currentModelId = '';
  private selectedModelId = AVAILABLE_MODELS[0].id; // Default to first model

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

  private async init(modelId?: string) {
    if (this.loading) {
      console.log('[NER] Already loading');
      return;
    }
    
    const targetModelId = modelId || this.selectedModelId;
    
    // If we're already initialized with the same model, don't reload
    if (this.initialized && this.currentModelId === targetModelId) {
      console.log('[NER] Already initialized with target model');
      return;
    }
    
    this.loading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.initialized = false;

    try {
      console.log('[NER] Starting initialization with model:', targetModelId);
      
      // Configure environment for better performance
      env.backends.onnx.wasm.numThreads = Math.min(navigator.hardwareConcurrency ?? 4, 4);
      
      // Device preference order: webgpu -> wasm -> cpu
      const deviceOptions: DeviceType[] = ['webgpu', 'wasm', 'cpu'];
      
      // Try to load the specific model
      const modelLoaded = await this.tryInitializeModel(targetModelId, deviceOptions);
      
      if (!modelLoaded) {
        throw new Error(`Failed to load model: ${targetModelId}`);
      }

      this.initialized = true;
      this.selectedModelId = targetModelId;
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
   * Switch to a different model
   */
  public async switchModel(modelId: string): Promise<void> {
    console.log('[NER] Switching to model:', modelId);
    
    // Reset current state
    this.classifier = null;
    this.initialized = false;
    this.currentModelId = '';
    
    // Initialize with new model
    await this.init(modelId);
  }

  /**
   * Get list of available models
   */
  public getAvailableModels(): ModelInfo[] {
    return AVAILABLE_MODELS;
  }

  /**
   * Get currently selected model info
   */
  public getCurrentModel(): ModelInfo | null {
    return AVAILABLE_MODELS.find(model => model.id === this.currentModelId) || null;
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
      
      // NeuroBERT uses standard token classification input
      const raw = await this.classifier(text);
      console.log('[NER] Raw inference result:', raw);

      const entities: NEREntity[] = [];
      const entityTypes: Record<string, number> = {};

      if (Array.isArray(raw)) {
        for (const r of raw) {
          // Handle NeuroBERT output format
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

  // Force reinitialize with current selected model
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
