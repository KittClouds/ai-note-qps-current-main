import { nerService as huggingFaceService, NEREntity, NERResult, NERStatus, ModelInfo, AVAILABLE_MODELS } from './nerService';
import { winkNERService, WinkNEREntity, WinkNERResult, WinkNERStatus } from './winkService';
import { enhancedWinkNERService, EnhancedWinkNERResult } from './enhancedWinkService';

export type NERProvider = 'huggingface' | 'wink' | 'enhanced-wink';

export interface UnifiedModelInfo {
  id: string;
  name: string;
  description: string;
  provider: NERProvider;
}

// Extended model list with enhanced Wink option
export const AVAILABLE_NER_MODELS: UnifiedModelInfo[] = [
  // HuggingFace models
  ...AVAILABLE_MODELS.map(model => ({
    ...model,
    name: `${model.name} (HuggingFace)`,
    provider: 'huggingface' as NERProvider
  })),
  // Enhanced Wink with custom patterns (recommended)
  {
    id: 'wink-eng-lite-web-model-enhanced',
    name: 'Wink NLP Enhanced (Recommended)',
    description: 'Wink NLP with custom patterns for improved entity detection',
    provider: 'enhanced-wink' as NERProvider
  },
  // Basic Wink models
  {
    id: 'wink-eng-lite-web-model',
    name: 'Wink NLP Basic',
    description: 'Basic NER using Wink NLP without custom patterns',
    provider: 'wink' as NERProvider
  }
];

export interface UnifiedNERResult {
  entities: NEREntity[];
  totalCount: number;
  entityTypes: Record<string, number>;
  processingTime?: number;
  textLength?: number;
  provider: NERProvider;
  // Enhanced fields for pattern-based results
  patternMatches?: number;
  customEntities?: number;
  patternsUsed?: string[];
}

export interface UnifiedNERStatus {
  isInitialized: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  modelId?: string;
  provider: NERProvider;
  // Enhanced status fields
  patternsInitialized?: boolean;
  patternStats?: any;
}

/**
 * Enhanced NER Service Manager with Custom Patterns Support
 */
class NERServiceManager {
  private currentProvider: NERProvider = 'enhanced-wink'; // Default to enhanced version
  private currentModelId: string = 'wink-eng-lite-web-model-enhanced';

  constructor() {
    console.log('[NERManager] Enhanced service manager initialized');
  }

  /**
   * Get list of all available models from all providers
   */
  public getAvailableModels(): UnifiedModelInfo[] {
    return AVAILABLE_NER_MODELS;
  }

  /**
   * Get currently selected model info
   */
  public getCurrentModel(): UnifiedModelInfo | null {
    return AVAILABLE_NER_MODELS.find(model => 
      model.id === this.currentModelId && model.provider === this.currentProvider
    ) || null;
  }

  /**
   * Switch to a different model/provider
   */
  public async switchModel(modelId: string): Promise<void> {
    console.log('[NERManager] Switching to model:', modelId);
    
    const targetModel = AVAILABLE_NER_MODELS.find(model => model.id === modelId);
    if (!targetModel) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    this.currentProvider = targetModel.provider;
    this.currentModelId = modelId;

    // Switch to the appropriate service
    if (this.currentProvider === 'huggingface') {
      await huggingFaceService.switchModel(modelId);
    } else if (this.currentProvider === 'wink') {
      // Basic Wink - just ensure it's initialized
      if (!winkNERService.isInitialized() && !winkNERService.isLoading()) {
        await winkNERService.reinitialize();
      }
    } else if (this.currentProvider === 'enhanced-wink') {
      // Enhanced Wink with patterns
      if (!enhancedWinkNERService.isInitialized() && !enhancedWinkNERService.isLoading()) {
        await enhancedWinkNERService.reinitialize();
      }
    }
  }

  /**
   * Extract entities using the current provider
   */
  public async extractEntities(text: string): Promise<UnifiedNERResult> {
    if (this.currentProvider === 'huggingface') {
      const result = await huggingFaceService.extractEntities(text);
      return {
        ...result,
        provider: 'huggingface'
      };
    } else if (this.currentProvider === 'wink') {
      const result = await winkNERService.extractEntities(text);
      return {
        ...result,
        provider: 'wink'
      };
    } else if (this.currentProvider === 'enhanced-wink') {
      const result = await enhancedWinkNERService.extractEntities(text);
      return {
        ...result,
        provider: 'enhanced-wink'
      };
    } else {
      throw new Error(`Unknown provider: ${this.currentProvider}`);
    }
  }

  /**
   * Get unified status from current provider
   */
  public getStatus(): UnifiedNERStatus {
    if (this.currentProvider === 'huggingface') {
      const status = huggingFaceService.getStatus();
      return {
        ...status,
        provider: 'huggingface'
      };
    } else if (this.currentProvider === 'wink') {
      const status = winkNERService.getStatus();
      return {
        ...status,
        provider: 'wink'
      };
    } else if (this.currentProvider === 'enhanced-wink') {
      const status = enhancedWinkNERService.getStatus();
      return {
        ...status,
        provider: 'enhanced-wink'
      };
    } else {
      return {
        isInitialized: false,
        isLoading: false,
        hasError: true,
        errorMessage: `Unknown provider: ${this.currentProvider}`,
        provider: this.currentProvider
      };
    }
  }

  /**
   * Reinitialize current provider
   */
  public async reinitialize(): Promise<void> {
    console.log('[NERManager] Reinitializing current provider:', this.currentProvider);
    
    if (this.currentProvider === 'huggingface') {
      await huggingFaceService.reinitialize();
    } else if (this.currentProvider === 'wink') {
      await winkNERService.reinitialize();
    } else if (this.currentProvider === 'enhanced-wink') {
      await enhancedWinkNERService.reinitialize();
    }
  }

  /**
   * Get current provider
   */
  public getCurrentProvider(): NERProvider {
    return this.currentProvider;
  }

  /**
   * Check if current service is initialized
   */
  public isInitialized(): boolean {
    if (this.currentProvider === 'huggingface') {
      return huggingFaceService.isInitialized();
    } else if (this.currentProvider === 'wink') {
      return winkNERService.isInitialized();
    } else if (this.currentProvider === 'enhanced-wink') {
      return enhancedWinkNERService.isInitialized();
    }
    return false;
  }

  /**
   * Check if current service is loading
   */
  public isLoading(): boolean {
    if (this.currentProvider === 'huggingface') {
      return huggingFaceService.isLoading();
    } else if (this.currentProvider === 'wink') {
      return winkNERService.isLoading();
    } else if (this.currentProvider === 'enhanced-wink') {
      return enhancedWinkNERService.isLoading();
    }
    return false;
  }

  /**
   * Check if current service has errors
   */
  public hasErrors(): boolean {
    if (this.currentProvider === 'huggingface') {
      return huggingFaceService.hasErrors();
    } else if (this.currentProvider === 'wink') {
      return winkNERService.hasErrors();
    } else if (this.currentProvider === 'enhanced-wink') {
      return enhancedWinkNERService.hasErrors();
    }
    return false;
  }

  /**
   * Get pattern statistics (only available for enhanced-wink)
   */
  public getPatternStats(): any {
    if (this.currentProvider === 'enhanced-wink') {
      return enhancedWinkNERService.getPatternStats();
    }
    return null;
  }

  /**
   * Reload patterns (only available for enhanced-wink)
   */
  public async reloadPatterns(): Promise<void> {
    if (this.currentProvider === 'enhanced-wink') {
      await enhancedWinkNERService.reloadPatterns();
    }
  }
}

// Export singleton instance
export const nerServiceManager = new NERServiceManager();
