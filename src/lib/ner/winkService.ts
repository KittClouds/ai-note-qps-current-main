
// @ts-ignore - We'll handle the import dynamically
let winkNLP: any = null;
let model: any = null;

// Dynamic import to handle potential loading issues
async function loadWinkNLP() {
  try {
    const winkModule = await import('wink-nlp');
    const modelModule = await import('wink-eng-lite-web-model');
    winkNLP = winkModule.default || winkModule;
    model = modelModule.default || modelModule;
    return true;
  } catch (error) {
    console.warn('Failed to load wink-nlp modules:', error);
    return false;
  }
}

export interface WinkNEREntity {
  value: string;
  type: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface WinkNERResult {
  entities: WinkNEREntity[];
  totalCount: number;
  entityTypes: Record<string, number>;
  processingTime?: number;
  textLength?: number;
}

export interface WinkNERStatus {
  isInitialized: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  modelId?: string;
}

/**
 * Wink NLP NER Service - Completely isolated from HuggingFace service
 */
class WinkNERService {
  private nlp: any = null;
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';
  private modelId = 'wink-eng-lite-web-model';

  constructor() {
    console.log('[WinkNER] Service initialized');
    this.initializeNLP();
  }

  private async initializeNLP() {
    if (this.loading) {
      console.log('[WinkNER] Already loading');
      return;
    }
    
    this.loading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.initialized = false;

    try {
      console.log('[WinkNER] Starting initialization');
      const loaded = await loadWinkNLP();
      
      if (loaded && winkNLP && model) {
        this.nlp = winkNLP(model);
        this.initialized = true;
        console.log('[WinkNER] Service initialized successfully');
      } else {
        throw new Error('Failed to load Wink NLP modules');
      }
    } catch (error) {
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error during initialization';
      console.error('[WinkNER] Initialization failed:', error);
      this.initialized = false;
    } finally {
      this.loading = false;
    }
  }

  public async extractEntities(text: string): Promise<WinkNERResult> {
    const startTime = Date.now();
    
    console.log('[WinkNER] Starting entity extraction');
    console.log('[WinkNER] Input text length:', text?.length || 0);

    // Validate input
    if (!text?.trim()) {
      console.warn('[WinkNER] Empty or invalid text input');
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
      await this.initializeNLP();
    }

    if (!this.initialized || !this.nlp) {
      console.error('[WinkNER] Service not properly initialized');
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: text.length
      };
    }

    try {
      console.log('[WinkNER] Running inference...');
      const doc = this.nlp.readDoc(text);
      const entities: WinkNEREntity[] = [];
      const entityTypes: Record<string, number> = {};

      // Extract standard entities
      doc.entities().each((entity: any) => {
        const value = entity.out();
        const type = entity.out(this.nlp.its.type);
        const detail = entity.out(this.nlp.its.detail);
        
        const nerEntity: WinkNEREntity = {
          value,
          type: type || 'UNKNOWN',
          start: detail?.start || 0,
          end: detail?.end || value.length,
          confidence: 0.9 // Wink doesn't provide confidence scores, so we use a default
        };

        entities.push(nerEntity);
        entityTypes[nerEntity.type] = (entityTypes[nerEntity.type] || 0) + 1;
      });

      const processingTime = Date.now() - startTime;
      console.log(`[WinkNER] Extraction completed in ${processingTime}ms`);
      console.log(`[WinkNER] Found ${entities.length} entities:`, entities);

      return {
        entities,
        totalCount: entities.length,
        entityTypes,
        processingTime,
        textLength: text.length
      };
    } catch (error) {
      console.error('[WinkNER] Inference error:', error);
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

  public getStatus(): WinkNERStatus {
    return {
      isInitialized: this.initialized,
      isLoading: this.loading,
      hasError: this.hasError,
      errorMessage: this.errorMessage,
      modelId: this.modelId
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
    console.log('[WinkNER] Force reinitializing...');
    this.initialized = false;
    this.loading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.nlp = null;
    await this.initializeNLP();
  }
}

// Export singleton instance
export const winkNERService = new WinkNERService();
