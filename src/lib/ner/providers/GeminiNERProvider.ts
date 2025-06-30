
import { NERResult, NERStatus } from '../nerServiceManager';
import { GeminiAPIClient } from '../apiClients/GeminiAPIClient';
import { coreNERService, NER_OUTPUT_SCHEMA } from '../coreNERService';

export interface GeminiModelInfo {
  id: string;
  name: string;
  description: string;
}

export const GEMINI_NER_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient NER with high accuracy'
  },
  {
    id: 'gemini-2.5-flash-lite-preview-06-17',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Lightweight version for faster processing'
  }
];

export class GeminiNERProvider {
  private apiClient: GeminiAPIClient;
  private currentModelId: string = GEMINI_NER_MODELS[0].id;

  constructor() {
    console.log('[GeminiNER] Provider initialized');
    this.apiClient = new GeminiAPIClient(this.currentModelId);
  }

  public async extractEntities(text: string): Promise<NERResult> {
    console.log('[GeminiNER] Starting entity extraction');
    console.log('[GeminiNER] Input text length:', text?.length || 0);

    // Validate input
    if (!text?.trim()) {
      return coreNERService.createEmptyResult();
    }

    // Generate standardized prompt using core service
    const prompt = coreNERService.generateNERPrompt(text);
    
    // Call API client for entity extraction
    const rawEntities = await this.apiClient.extractEntities(text, prompt, NER_OUTPUT_SCHEMA);
    
    // Process entities using core service
    return coreNERService.processEntities(rawEntities, text);
  }

  public async switchModel(modelId: string): Promise<void> {
    console.log('[GeminiNER] Switching to model:', modelId);
    
    const targetModel = GEMINI_NER_MODELS.find(model => model.id === modelId);
    if (!targetModel) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    this.currentModelId = modelId;
    this.apiClient.switchModel(modelId);
    console.log('[GeminiNER] Model switched successfully');
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
    console.log('[GeminiNER] Reinitializing...');
    await this.apiClient.reinitialize();
  }

  public getAvailableModels(): GeminiModelInfo[] {
    return GEMINI_NER_MODELS;
  }

  public getCurrentModel(): GeminiModelInfo | null {
    return GEMINI_NER_MODELS.find(model => model.id === this.currentModelId) || null;
  }
}

export const geminiNERProvider = new GeminiNERProvider();
