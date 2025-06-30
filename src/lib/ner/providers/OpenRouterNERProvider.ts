
import { NEREntity, NERResult, NERStatus } from '../nerServiceManager';
import { OpenRouterAPIClient } from '../apiClients/OpenRouterAPIClient';
import { coreNERService, NER_OUTPUT_SCHEMA } from '../coreNERService';

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
  },
  {
    id: 'microsoft/mai-ds-r1:free',
    name: 'Microsoft MAI DS R1',
    description: 'Microsoft AI model for data science tasks'
  }
];

export class OpenRouterNERProvider {
  private apiClient: OpenRouterAPIClient;
  private currentModelId: string = OPENROUTER_NER_MODELS[0].id;

  constructor() {
    console.log('[OpenRouterNER] Provider initialized');
    this.apiClient = new OpenRouterAPIClient(this.currentModelId);
  }

  public async extractEntities(text: string): Promise<NERResult> {
    const startTime = Date.now();
    
    console.log('[OpenRouterNER] Starting entity extraction');
    console.log('[OpenRouterNER] Input text length:', text?.length || 0);

    // Validate input
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

    // Generate standardized prompt using core service
    const prompt = coreNERService.generateNERPrompt(text);
    
    // Call API client for entity extraction
    const rawEntities = await this.apiClient.extractEntities(text, prompt, NER_OUTPUT_SCHEMA);
    
    // Process entities using core service
    return coreNERService.processEntities(rawEntities, text);
  }

  public async switchModel(modelId: string): Promise<void> {
    console.log('[OpenRouterNER] Switching to model:', modelId);
    
    const targetModel = OPENROUTER_NER_MODELS.find(model => model.id === modelId);
    if (!targetModel) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    this.currentModelId = modelId;
    this.apiClient.switchModel(modelId);
    console.log('[OpenRouterNER] Model switched successfully');
  }

  public getStatus(): NERStatus {
    const clientStatus = this.apiClient.getStatus();
    return {
      isInitialized: clientStatus.isInitialized,
      isLoading: clientStatus.isLoading,
      hasError: clientStatus.hasError,
      errorMessage: clientStatus.errorMessage,
      modelId: this.currentModelId
    };
  }

  public isInitialized(): boolean {
    return this.apiClient.isConfigured();
  }

  public isLoading(): boolean {
    return this.apiClient.getStatus().isLoading;
  }

  public hasErrors(): boolean {
    return this.apiClient.getStatus().hasError;
  }

  public getErrorMessage(): string {
    return this.apiClient.getStatus().errorMessage || '';
  }

  public async reinitialize(): Promise<void> {
    console.log('[OpenRouterNER] Reinitializing...');
    await this.apiClient.reinitialize();
  }

  public getAvailableModels(): OpenRouterModelInfo[] {
    return OPENROUTER_NER_MODELS;
  }

  public getCurrentModel(): OpenRouterModelInfo | null {
    return OPENROUTER_NER_MODELS.find(model => model.id === this.currentModelId) || null;
  }
}

export const openRouterNERProvider = new OpenRouterNERProvider();
