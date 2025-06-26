
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

class WinkService {
  private nlp: any;
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';
  private modelId = 'wink-eng-lite-web-model';

  constructor() {
    console.log('[Wink] Service initialized');
  }

  private async init() {
    if (this.loading || this.initialized) return;
    
    this.loading = true;
    this.hasError = false;
    this.errorMessage = '';

    try {
      console.log('[Wink] Starting initialization...');
      const loaded = await loadWinkNLP();
      
      if (loaded && winkNLP && model) {
        this.nlp = winkNLP(model);
        this.initialized = true;
        console.log('[Wink] Service initialized successfully');
      } else {
        throw new Error('Failed to load Wink NLP modules');
      }
    } catch (error) {
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error during initialization';
      console.error('[Wink] Initialization failed:', error);
      this.initialized = false;
    } finally {
      this.loading = false;
    }
  }

  public async extractEntities(text: string): Promise<NERResult> {
    const startTime = Date.now();
    
    console.log('[Wink] Starting entity extraction');
    console.log('[Wink] Input text length:', text?.length || 0);

    if (!text?.trim()) {
      console.warn('[Wink] Empty or invalid text input');
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: 0
      };
    }

    // Ensure service is initialized
    await this.init();

    if (!this.initialized || !this.nlp) {
      console.error('[Wink] Service not properly initialized');
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: text.length
      };
    }

    try {
      console.log('[Wink] Running NER analysis...');
      const doc = this.nlp.readDoc(text);
      const entities: NEREntity[] = [];
      const entityTypes: Record<string, number> = {};

      // Extract standard entities
      doc.entities().each((entity: any) => {
        const value = entity.out();
        const type = entity.out(this.nlp.its.type);
        const detail = entity.out(this.nlp.its.detail);
        
        if (value && type) {
          const nerEntity: NEREntity = {
            value,
            type,
            start: detail?.start || 0,
            end: detail?.end || value.length,
            confidence: 1.0 // Wink doesn't provide confidence scores
          };

          entities.push(nerEntity);
          entityTypes[type] = (entityTypes[type] || 0) + 1;
        }
      });

      const processingTime = Date.now() - startTime;
      console.log(`[Wink] Extraction completed in ${processingTime}ms`);
      console.log(`[Wink] Found ${entities.length} entities:`, entities);

      return {
        entities,
        totalCount: entities.length,
        entityTypes,
        processingTime,
        textLength: text.length
      };
    } catch (error) {
      console.error('[Wink] Extraction error:', error);
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'Extraction failed';
      
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: text.length
      };
    }
  }

  public getStatus(): NERStatus {
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
    console.log('[Wink] Force reinitializing...');
    this.initialized = false;
    this.loading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.nlp = null;
    await this.init();
  }

  public getCurrentModel(): ModelInfo {
    return {
      id: this.modelId,
      name: 'Wink English Lite',
      description: 'Lightweight English NER model'
    };
  }
}

export const winkService = new WinkService();
