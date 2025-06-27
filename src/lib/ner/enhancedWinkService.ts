
// @ts-ignore - We'll handle the import dynamically
let winkNLP: any = null;
let model: any = null;

import { customPatternService } from './customPatternService';
import { WinkNEREntity, WinkNERResult, WinkNERStatus } from './winkService';

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

export interface EnhancedWinkNERResult extends WinkNERResult {
  patternMatches: number;
  customEntities: number;
  patternsUsed: string[];
}

/**
 * Enhanced Wink NLP NER Service with Custom Patterns Support
 */
class EnhancedWinkNERService {
  private nlp: any = null;
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';
  private modelId = 'wink-eng-lite-web-model-enhanced';
  private patternsInitialized = false;

  constructor() {
    console.log('[EnhancedWinkNER] Service initialized');
    this.initializeNLP();
  }

  private async initializeNLP() {
    if (this.loading) {
      console.log('[EnhancedWinkNER] Already loading');
      return;
    }
    
    this.loading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.initialized = false;
    this.patternsInitialized = false;

    try {
      console.log('[EnhancedWinkNER] Starting initialization');
      const loaded = await loadWinkNLP();
      
      if (loaded && winkNLP && model) {
        this.nlp = winkNLP(model);
        await this.initializeCustomPatterns();
        this.initialized = true;
        console.log('[EnhancedWinkNER] Service initialized successfully with custom patterns');
      } else {
        throw new Error('Failed to load Wink NLP modules');
      }
    } catch (error) {
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error during initialization';
      console.error('[EnhancedWinkNER] Initialization failed:', error);
      this.initialized = false;
    } finally {
      this.loading = false;
    }
  }

  private async initializeCustomPatterns() {
    try {
      console.log('[EnhancedWinkNER] Initializing custom patterns');
      
      // Initialize the pattern service
      await customPatternService.initializePatternsWithWink();
      
      // Get patterns from the pattern service
      const customPatterns = customPatternService.getEnabledPatternsForWink();
      
      if (customPatterns.length > 0) {
        console.log('[EnhancedWinkNER] Learning', customPatterns.length, 'custom pattern groups');
        
        // Learn custom entities with patterns
        this.nlp.learnCustomEntities(customPatterns, { force: true });
        this.patternsInitialized = true;
        
        const stats = customPatternService.getPatternStats();
        console.log('[EnhancedWinkNER] Custom patterns initialized:', stats);
      } else {
        console.log('[EnhancedWinkNER] No custom patterns enabled');
      }
    } catch (error) {
      console.error('[EnhancedWinkNER] Failed to initialize custom patterns:', error);
      // Don't fail the entire initialization if patterns fail
      this.patternsInitialized = false;
    }
  }

  public async extractEntities(text: string): Promise<EnhancedWinkNERResult> {
    const startTime = Date.now();
    
    console.log('[EnhancedWinkNER] Starting enhanced entity extraction');
    console.log('[EnhancedWinkNER] Input text length:', text?.length || 0);
    console.log('[EnhancedWinkNER] Patterns initialized:', this.patternsInitialized);

    // Validate input
    if (!text?.trim()) {
      console.warn('[EnhancedWinkNER] Empty or invalid text input');
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: 0,
        patternMatches: 0,
        customEntities: 0,
        patternsUsed: []
      };
    }

    // Ensure model is loaded
    if (!this.initialized) {
      await this.initializeNLP();
    }

    if (!this.initialized || !this.nlp) {
      console.error('[EnhancedWinkNER] Service not properly initialized');
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: text.length,
        patternMatches: 0,
        customEntities: 0,
        patternsUsed: []
      };
    }

    try {
      console.log('[EnhancedWinkNER] Running enhanced inference...');
      const doc = this.nlp.readDoc(text);
      const entities: WinkNEREntity[] = [];
      const entityTypes: Record<string, number> = {};
      const patternsUsed: string[] = [];
      let patternMatches = 0;
      let customEntities = 0;

      // Extract standard entities
      doc.entities().each((entity: any) => {
        const value = entity.out();
        const type = entity.out(this.nlp.its.type);
        const detail = entity.out(this.nlp.its.detail);
        
        // Check if this is a custom pattern match
        const isCustomPattern = this.isCustomPatternEntity(type);
        if (isCustomPattern) {
          patternMatches++;
          customEntities++;
          if (!patternsUsed.includes(type)) {
            patternsUsed.push(type);
          }
        }
        
        const nerEntity: WinkNEREntity = {
          value,
          type: type || 'UNKNOWN',
          start: detail?.start || 0,
          end: detail?.end || value.length,
          confidence: isCustomPattern ? 0.9 : 0.8 // Higher confidence for pattern matches
        };

        entities.push(nerEntity);
        entityTypes[nerEntity.type] = (entityTypes[nerEntity.type] || 0) + 1;
      });

      const processingTime = Date.now() - startTime;
      console.log(`[EnhancedWinkNER] Enhanced extraction completed in ${processingTime}ms`);
      console.log(`[EnhancedWinkNER] Found ${entities.length} entities (${customEntities} from patterns)`);
      console.log(`[EnhancedWinkNER] Patterns used:`, patternsUsed);

      return {
        entities,
        totalCount: entities.length,
        entityTypes,
        processingTime,
        textLength: text.length,
        patternMatches,
        customEntities,
        patternsUsed
      };
    } catch (error) {
      console.error('[EnhancedWinkNER] Enhanced inference error:', error);
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'Enhanced inference failed';
      
      return {
        entities: [],
        totalCount: 0,
        entityTypes: {},
        processingTime: Date.now() - startTime,
        textLength: text.length,
        patternMatches: 0,
        customEntities: 0,
        patternsUsed: []
      };
    }
  }

  private isCustomPatternEntity(entityType: string): boolean {
    const stats = customPatternService.getPatternStats();
    return stats.entityTypes.includes(entityType);
  }

  public getStatus(): WinkNERStatus & { patternsInitialized: boolean; patternStats: any } {
    const stats = customPatternService.getPatternStats();
    return {
      isInitialized: this.initialized,
      isLoading: this.loading,
      hasError: this.hasError,
      errorMessage: this.errorMessage,
      modelId: this.modelId,
      patternsInitialized: this.patternsInitialized,
      patternStats: stats
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
    console.log('[EnhancedWinkNER] Force reinitializing with fresh patterns...');
    this.initialized = false;
    this.loading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.nlp = null;
    this.patternsInitialized = false;
    await this.initializeNLP();
  }

  public getPatternStats() {
    return customPatternService.getPatternStats();
  }

  public async reloadPatterns(): Promise<void> {
    if (this.initialized && this.nlp) {
      console.log('[EnhancedWinkNER] Reloading patterns...');
      await this.initializeCustomPatterns();
    }
  }
}

// Export singleton instance
export const enhancedWinkNERService = new EnhancedWinkNERService();
