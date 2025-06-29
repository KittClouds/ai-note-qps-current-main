
import { geminiNERProvider, GEMINI_NER_MODELS, GeminiModelInfo } from './providers/GeminiNERProvider';
import { winkNERService, WinkNEREntity, WinkNERResult, WinkNERStatus } from './winkService';

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

export type NERProvider = 'gemini' | 'wink';

export interface UnifiedModelInfo {
  id: string;
  name: string;
  description: string;
  provider: NERProvider;
}

// Unified model list with Gemini and Wink
export const AVAILABLE_NER_MODELS: UnifiedModelInfo[] = [
  // Gemini models
  ...GEMINI_NER_MODELS.map(model => ({
    ...model,
    name: `${model.name} (Gemini)`,
    provider: 'gemini' as NERProvider
  })),
  // Wink model
  {
    id: 'wink-eng-lite-web-model',
    name: 'Wink NLP Basic (Wink)',
    description: 'Basic NER using Wink NLP',
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
}

export interface UnifiedNERStatus {
  isInitialized: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  modelId?: string;
  provider: NERProvider;
}

/**
 * NER Service Manager - Handles switching between Gemini and Wink services
 */
class NERServiceManager {
  private currentProvider: NERProvider = 'gemini';
  private currentModelId: string = GEMINI_NER_MODELS[0].id;

  constructor() {
    console.log('[NERManager] Service manager initialized with Gemini and Wink');
  }

  /**
   * Get list of all available models from both providers
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
    if (this.currentProvider === 'gemini') {
      await geminiNERProvider.switchModel(modelId);
    } else if (this.currentProvider === 'wink') {
      // Wink only has one model, so just ensure it's initialized
      if (!winkNERService.isInitialized() && !winkNERService.isLoading()) {
        await winkNERService.reinitialize();
      }
    }
  }

  /**
   * Extract entities using the current provider
   */
  public async extractEntities(text: string): Promise<UnifiedNERResult> {
    if (this.currentProvider === 'gemini') {
      const result = await geminiNERProvider.extractEntities(text);
      return {
        ...result,
        provider: 'gemini'
      };
    } else if (this.currentProvider === 'wink') {
      const result = await winkNERService.extractEntities(text);
      return {
        ...result,
        provider: 'wink'
      };
    } else {
      throw new Error(`Unknown provider: ${this.currentProvider}`);
    }
  }

  /**
   * Get unified status from current provider
   */
  public getStatus(): UnifiedNERStatus {
    if (this.currentProvider === 'gemini') {
      const status = geminiNERProvider.getStatus();
      return {
        ...status,
        provider: 'gemini'
      };
    } else if (this.currentProvider === 'wink') {
      const status = winkNERService.getStatus();
      return {
        ...status,
        provider: 'wink'
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
    
    if (this.currentProvider === 'gemini') {
      await geminiNERProvider.reinitialize();
    } else if (this.currentProvider === 'wink') {
      await winkNERService.reinitialize();
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
    if (this.currentProvider === 'gemini') {
      return geminiNERProvider.isInitialized();
    } else if (this.currentProvider === 'wink') {
      return winkNERService.isInitialized();
    }
    return false;
  }

  /**
   * Check if current service is loading
   */
  public isLoading(): boolean {
    if (this.currentProvider === 'gemini') {
      return geminiNERProvider.isLoading();
    } else if (this.currentProvider === 'wink') {
      return winkNERService.isLoading();
    }
    return false;
  }

  /**
   * Check if current service has errors
   */
  public hasErrors(): boolean {
    if (this.currentProvider === 'gemini') {
      return geminiNERProvider.hasErrors();
    } else if (this.currentProvider === 'wink') {
      return winkNERService.hasErrors();
    }
    return false;
  }
}

// Export singleton instance
export const nerServiceManager = new NERServiceManager();
