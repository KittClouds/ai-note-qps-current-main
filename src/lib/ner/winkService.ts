
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

// Custom pattern definitions
export interface CustomPattern {
  name: string;
  patterns: string[];
  description?: string;
}

export interface PatternSet {
  [key: string]: CustomPattern;
}

// Default patterns for common entity types
const DEFAULT_PATTERNS: PatternSet = {
  PERSON: {
    name: 'PERSON',
    patterns: [
      '[PROPN] [PROPN]',           // John Smith
      '[PROPN] [PROPN] [PROPN]',   // John Michael Smith
      'Mr. [PROPN] [PROPN]',       // Mr. John Smith
      'Ms. [PROPN] [PROPN]',       // Ms. Jane Doe
      'Dr. [PROPN] [PROPN]',       // Dr. Sarah Johnson
      '[PROPN] [PROPN], [PROPN]'   // Smith, John
    ],
    description: 'Patterns for detecting person names'
  },
  ORGANIZATION: {
    name: 'ORGANIZATION',
    patterns: [
      '[PROPN] Corp.',
      '[PROPN] Inc.',
      '[PROPN] Ltd.',
      '[PROPN] [PROPN] Company',
      'The [PROPN] [PROPN]'
    ],
    description: 'Patterns for detecting organizations'
  },
  PROJECT_CODE: {
    name: 'PROJECT_CODE',
    patterns: [
      'PROJ-[NUM]',
      'PRJ-[NUM]',
      'TASK-[NUM]',
      'TICKET-[NUM]'
    ],
    description: 'Patterns for project codes and identifiers'
  },
  EMAIL: {
    name: 'EMAIL',
    patterns: [
      '[WORD]@[WORD].[WORD]',
      '[WORD].[WORD]@[WORD].[WORD]'
    ],
    description: 'Patterns for email addresses'
  },
  PHONE: {
    name: 'PHONE',
    patterns: [
      '[NUM]-[NUM]-[NUM]',
      '([NUM]) [NUM]-[NUM]',
      '+[NUM] [NUM] [NUM] [NUM]'
    ],
    description: 'Patterns for phone numbers'
  }
};

export interface WinkNEREntity {
  value: string;
  type: string;
  start: number;
  end: number;
  confidence?: number;
  source?: 'standard' | 'pattern';
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
  patternsLoaded?: number;
}

// Pattern management storage key
const PATTERNS_STORAGE_KEY = 'wink-nlp-custom-patterns';

/**
 * Enhanced Wink NLP NER Service with Custom Patterns
 */
class WinkNERService {
  private nlp: any = null;
  private initialized = false;
  private loading = false;
  private hasError = false;
  private errorMessage = '';
  private modelId = 'wink-eng-lite-web-model';
  private customPatterns: PatternSet = {};
  private patternsLoaded = 0;

  constructor() {
    console.log('[WinkNER] Service initialized with pattern support');
    this.loadCustomPatterns();
    this.initializeNLP();
  }

  /**
   * Load custom patterns from localStorage
   */
  private loadCustomPatterns() {
    try {
      const stored = localStorage.getItem(PATTERNS_STORAGE_KEY);
      if (stored) {
        const loadedPatterns = JSON.parse(stored);
        this.customPatterns = { ...DEFAULT_PATTERNS, ...loadedPatterns };
      } else {
        this.customPatterns = { ...DEFAULT_PATTERNS };
      }
      console.log('[WinkNER] Loaded custom patterns:', Object.keys(this.customPatterns));
    } catch (error) {
      console.warn('[WinkNER] Failed to load custom patterns:', error);
      this.customPatterns = { ...DEFAULT_PATTERNS };
    }
  }

  /**
   * Save custom patterns to localStorage
   */
  private saveCustomPatterns() {
    try {
      // Only save non-default patterns
      const customOnly = Object.fromEntries(
        Object.entries(this.customPatterns).filter(([key]) => !DEFAULT_PATTERNS[key])
      );
      localStorage.setItem(PATTERNS_STORAGE_KEY, JSON.stringify(customOnly));
      console.log('[WinkNER] Saved custom patterns to localStorage');
    } catch (error) {
      console.warn('[WinkNER] Failed to save custom patterns:', error);
    }
  }

  /**
   * Apply custom patterns to the NLP instance
   */
  private applyCustomPatterns() {
    if (!this.nlp) return;

    try {
      // Convert patterns to wink-nlp format
      const patterns = Object.values(this.customPatterns).map(pattern => ({
        name: pattern.name,
        patterns: pattern.patterns
      }));

      console.log('[WinkNER] Applying custom patterns:', patterns);
      this.nlp.learnCustomEntities(patterns, { force: true });
      this.patternsLoaded = patterns.length;
      console.log(`[WinkNER] Applied ${this.patternsLoaded} custom patterns`);
    } catch (error) {
      console.error('[WinkNER] Failed to apply custom patterns:', error);
    }
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
      console.log('[WinkNER] Starting initialization with pattern support');
      const loaded = await loadWinkNLP();
      
      if (loaded && winkNLP && model) {
        this.nlp = winkNLP(model);
        
        // Apply custom patterns after model initialization
        this.applyCustomPatterns();
        
        this.initialized = true;
        console.log('[WinkNER] Service initialized successfully with patterns');
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

  /**
   * Enhanced entity extraction with pattern support
   */
  public async extractEntities(text: string): Promise<WinkNERResult> {
    const startTime = Date.now();
    
    console.log('[WinkNER] Starting enhanced entity extraction');
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
      console.log('[WinkNER] Running enhanced inference...');
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
          confidence: 0.9,
          source: 'standard'
        };

        entities.push(nerEntity);
        entityTypes[nerEntity.type] = (entityTypes[nerEntity.type] || 0) + 1;
      });

      // Extract custom pattern entities
      const customEntities = doc.customEntities();
      if (customEntities && customEntities.each) {
        customEntities.each((entity: any) => {
          const value = entity.out();
          const type = entity.out(this.nlp.its.type);
          const detail = entity.out(this.nlp.its.detail);
          
          const nerEntity: WinkNEREntity = {
            value,
            type: type || 'CUSTOM',
            start: detail?.start || 0,
            end: detail?.end || value.length,
            confidence: 0.95, // Higher confidence for pattern matches
            source: 'pattern'
          };

          entities.push(nerEntity);
          entityTypes[nerEntity.type] = (entityTypes[nerEntity.type] || 0) + 1;
        });
      }

      // Remove duplicate entities (prefer pattern matches)
      const uniqueEntities = this.removeDuplicateEntities(entities);

      const processingTime = Date.now() - startTime;
      console.log(`[WinkNER] Enhanced extraction completed in ${processingTime}ms`);
      console.log(`[WinkNER] Found ${uniqueEntities.length} entities:`, uniqueEntities);

      return {
        entities: uniqueEntities,
        totalCount: uniqueEntities.length,
        entityTypes,
        processingTime,
        textLength: text.length
      };
    } catch (error) {
      console.error('[WinkNER] Enhanced inference error:', error);
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

  /**
   * Remove duplicate entities, preferring pattern matches
   */
  private removeDuplicateEntities(entities: WinkNEREntity[]): WinkNEREntity[] {
    const entityMap = new Map<string, WinkNEREntity>();

    for (const entity of entities) {
      const key = `${entity.start}-${entity.end}`;
      const existing = entityMap.get(key);

      if (!existing || (entity.source === 'pattern' && existing.source === 'standard')) {
        entityMap.set(key, entity);
      }
    }

    return Array.from(entityMap.values()).sort((a, b) => a.start - b.start);
  }

  /**
   * Add a custom pattern
   */
  public addCustomPattern(pattern: CustomPattern): void {
    this.customPatterns[pattern.name] = pattern;
    this.saveCustomPatterns();
    
    // Reapply patterns if NLP is initialized
    if (this.initialized) {
      this.applyCustomPatterns();
    }
    
    console.log(`[WinkNER] Added custom pattern: ${pattern.name}`);
  }

  /**
   * Remove a custom pattern
   */
  public removeCustomPattern(patternName: string): void {
    if (DEFAULT_PATTERNS[patternName]) {
      console.warn(`[WinkNER] Cannot remove default pattern: ${patternName}`);
      return;
    }

    delete this.customPatterns[patternName];
    this.saveCustomPatterns();
    
    // Reapply patterns if NLP is initialized
    if (this.initialized) {
      this.applyCustomPatterns();
    }
    
    console.log(`[WinkNER] Removed custom pattern: ${patternName}`);
  }

  /**
   * Get all custom patterns
   */
  public getCustomPatterns(): PatternSet {
    return { ...this.customPatterns };
  }

  /**
   * Get default patterns
   */
  public getDefaultPatterns(): PatternSet {
    return { ...DEFAULT_PATTERNS };
  }

  /**
   * Reset to default patterns
   */
  public resetToDefaultPatterns(): void {
    this.customPatterns = { ...DEFAULT_PATTERNS };
    localStorage.removeItem(PATTERNS_STORAGE_KEY);
    
    // Reapply patterns if NLP is initialized
    if (this.initialized) {
      this.applyCustomPatterns();
    }
    
    console.log('[WinkNER] Reset to default patterns');
  }

  /**
   * Test a pattern against sample text
   */
  public testPattern(pattern: CustomPattern, testText: string): WinkNEREntity[] {
    if (!this.initialized || !this.nlp) {
      console.warn('[WinkNER] Service not initialized for pattern testing');
      return [];
    }

    try {
      // Create a temporary NLP instance for testing
      const testNLP = winkNLP(model);
      testNLP.learnCustomEntities([pattern], { force: true });
      
      const doc = testNLP.readDoc(testText);
      const entities: WinkNEREntity[] = [];

      const customEntities = doc.customEntities();
      if (customEntities && customEntities.each) {
        customEntities.each((entity: any) => {
          const value = entity.out();
          const type = entity.out(testNLP.its.type);
          const detail = entity.out(testNLP.its.detail);
          
          entities.push({
            value,
            type: type || pattern.name,
            start: detail?.start || 0,
            end: detail?.end || value.length,
            confidence: 0.95,
            source: 'pattern'
          });
        });
      }

      return entities;
    } catch (error) {
      console.error('[WinkNER] Pattern testing error:', error);
      return [];
    }
  }

  public getStatus(): WinkNERStatus {
    return {
      isInitialized: this.initialized,
      isLoading: this.loading,
      hasError: this.hasError,
      errorMessage: this.errorMessage,
      modelId: this.modelId,
      patternsLoaded: this.patternsLoaded
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
    console.log('[WinkNER] Force reinitializing with patterns...');
    this.initialized = false;
    this.loading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.nlp = null;
    this.patternsLoaded = 0;
    
    // Reload patterns and reinitialize
    this.loadCustomPatterns();
    await this.initializeNLP();
  }
}

// Export singleton instance
export const winkNERService = new WinkNERService();
