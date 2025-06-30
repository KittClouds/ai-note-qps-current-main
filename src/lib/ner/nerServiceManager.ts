import { GeminiAPIClient } from './apiClients/GeminiAPIClient';
import { OpenRouterAPIClient } from './apiClients/OpenRouterAPIClient';
import { winkNERService, WinkNEREntity, WinkNERResult, WinkNERStatus } from './winkService';
import { coreNERService, NER_OUTPUT_SCHEMA } from './coreNERService';
import { knowledgeGraphService, KNOWLEDGE_GRAPH_SCHEMA } from '../knowledge-graph/knowledgeGraphService';
import { KnowledgeGraph } from '../knowledge-graph/types';
import { graphFileService } from '../knowledge-graph/graphFileService';

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

export type NERProvider = 'gemini' | 'wink' | 'openrouter';

export interface UnifiedModelInfo {
  id: string;
  name: string;
  description: string;
  provider: NERProvider;
}

// Model definitions
export const GEMINI_NER_MODELS = [
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

export const OPENROUTER_NER_MODELS = [
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

// Unified model list with Gemini, OpenRouter, and Wink
export const AVAILABLE_NER_MODELS: UnifiedModelInfo[] = [
  // Gemini models
  ...GEMINI_NER_MODELS.map(model => ({
    ...model,
    name: `${model.name} (Gemini)`,
    provider: 'gemini' as NERProvider
  })),
  // OpenRouter models
  ...OPENROUTER_NER_MODELS.map(model => ({
    ...model,
    name: `${model.name} (OpenRouter)`,
    provider: 'openrouter' as NERProvider
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

export interface UnifiedKnowledgeGraphResult {
  knowledgeGraph: KnowledgeGraph;
  provider: NERProvider;
  graphFileGenerated?: boolean;
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
 * NER Service Manager - Handles switching between Gemini, OpenRouter, and Wink services
 */
export class NERServiceManager {
  private currentProvider: NERProvider = 'gemini';
  private currentModelId: string = GEMINI_NER_MODELS[0].id;
  private geminiClient: GeminiAPIClient;
  private openRouterClient: OpenRouterAPIClient;
  private currentAPIClient: GeminiAPIClient | OpenRouterAPIClient | null = null;

  constructor() {
    console.log('[NERManager] Service manager initialized with Gemini, OpenRouter, and Wink');
    this.geminiClient = new GeminiAPIClient(this.currentModelId);
    this.openRouterClient = new OpenRouterAPIClient(OPENROUTER_NER_MODELS[0].id);
    
    // Initialize currentAPIClient to match the default provider
    this.currentAPIClient = this.geminiClient;
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

    // Switch to the appropriate client
    if (this.currentProvider === 'gemini') {
      this.geminiClient.switchModel(modelId);
      this.currentAPIClient = this.geminiClient;
    } else if (this.currentProvider === 'openrouter') {
      this.openRouterClient.switchModel(modelId);
      this.currentAPIClient = this.openRouterClient;
    } else if (this.currentProvider === 'wink') {
      // Wink only has one model, so just ensure it's initialized
      this.currentAPIClient = null; // Wink doesn't use API clients
      if (!winkNERService.isInitialized() && !winkNERService.isLoading()) {
        await winkNERService.reinitialize();
      }
    }
  }

  /**
   * Extract entities using the current provider
   */
  public async extractEntities(text: string): Promise<UnifiedNERResult> {
    if (!text?.trim()) {
      const emptyResult = coreNERService.createEmptyResult();
      return {
        ...emptyResult,
        provider: this.currentProvider
      };
    }

    if (this.currentProvider === 'gemini') {
      const prompt = coreNERService.generateNERPrompt(text);
      const rawEntities = await this.geminiClient.extractEntities(text, prompt, NER_OUTPUT_SCHEMA);
      const result = coreNERService.processEntities(rawEntities, text);
      return {
        ...result,
        provider: 'gemini'
      };
    } else if (this.currentProvider === 'openrouter') {
      const prompt = coreNERService.generateNERPrompt(text);
      const rawEntities = await this.openRouterClient.extractEntities(text, prompt, NER_OUTPUT_SCHEMA);
      const result = coreNERService.processEntities(rawEntities, text);
      return {
        ...result,
        provider: 'openrouter'
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
   * Extract knowledge graph using the current provider with computational graph generation
   */
  public async extractKnowledgeGraph(
    text: string, 
    note?: any, 
    connections?: any
  ): Promise<UnifiedKnowledgeGraphResult> {
    console.log('[NERServiceManager] Starting knowledge graph extraction');
    
    if (this.currentProvider === 'wink') {
      // Wink provider doesn't support knowledge graph extraction yet
      throw new Error('Knowledge graph extraction is not supported with the Wink provider');
    }
    
    if (!this.currentAPIClient) {
      throw new Error('API client not properly initialized for knowledge graph extraction');
    }

    const startTime = Date.now();
    
    try {
      const prompt = knowledgeGraphService.generateKnowledgeGraphPrompt(text);
      console.log('[NERServiceManager] Generated prompt for knowledge graph');

      // Use the API client to extract the knowledge graph
      const rawEntities = await this.currentAPIClient.extractEntities(
        text, 
        prompt, 
        KNOWLEDGE_GRAPH_SCHEMA
      );

      console.log('[NERServiceManager] Raw API response:', rawEntities);

      // For knowledge graph, we need to parse the response differently
      // The API should return the full knowledge graph structure, but we might only get entities
      // Let's try to reconstruct the knowledge graph from the response
      let knowledgeGraphData;
      
      if (Array.isArray(rawEntities)) {
        // If we only got entities, create a minimal knowledge graph structure
        console.log('[NERServiceManager] Received entities array, creating knowledge graph structure');
        knowledgeGraphData = {
          entities: rawEntities,
          triples: []
        };
      } else {
        // If we got a full knowledge graph object, use it directly
        console.log('[NERServiceManager] Received full knowledge graph object');
        knowledgeGraphData = rawEntities;
      }

      // Process knowledge graph and generate computational graph
      const knowledgeGraph = await knowledgeGraphService.processKnowledgeGraph(
        knowledgeGraphData, 
        text, 
        note, 
        connections
      );
      
      const processingTime = Date.now() - startTime;

      console.log(`[NERServiceManager] Knowledge graph extraction completed in ${processingTime}ms`);
      console.log(`[NERServiceManager] Found ${knowledgeGraph.totalEntities} entities and ${knowledgeGraph.totalTriples} triples`);

      // Check if computational graph file was generated
      const graphFileGenerated = note && connections;

      return { 
        knowledgeGraph, 
        provider: this.currentProvider,
        graphFileGenerated: !!graphFileGenerated
      };
    } catch (error) {
      console.error('[NERServiceManager] Error during knowledge graph extraction:', error);
      throw new Error(`Knowledge graph extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get unified status from current provider
   */
  public getStatus(): UnifiedNERStatus {
    if (this.currentProvider === 'gemini') {
      const status = this.geminiClient.getStatus();
      return {
        ...status,
        modelId: this.currentModelId,
        provider: 'gemini'
      };
    } else if (this.currentProvider === 'openrouter') {
      const status = this.openRouterClient.getStatus();
      return {
        ...status,
        modelId: this.currentModelId,
        provider: 'openrouter'
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
      await this.geminiClient.reinitialize();
    } else if (this.currentProvider === 'openrouter') {
      await this.openRouterClient.reinitialize();
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
      return this.geminiClient.isConfigured();
    } else if (this.currentProvider === 'openrouter') {
      return this.openRouterClient.isConfigured();
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
      return this.geminiClient.getStatus().isLoading;
    } else if (this.currentProvider === 'openrouter') {
      return this.openRouterClient.getStatus().isLoading;
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
      return this.geminiClient.getStatus().hasError;
    } else if (this.currentProvider === 'openrouter') {
      return this.openRouterClient.getStatus().hasError;
    } else if (this.currentProvider === 'wink') {
      return winkNERService.hasErrors();
    }
    return false;
  }

  private isReady(): boolean {
    if (this.currentProvider === 'wink') {
      return winkNERService.isInitialized();
    }
    return this.currentAPIClient !== null && this.isInitialized();
  }

  private async initialize(): Promise<void> {
    if (this.currentProvider === 'gemini') {
      this.geminiClient.initialize();
      this.currentAPIClient = this.geminiClient;
    } else if (this.currentProvider === 'openrouter') {
      this.openRouterClient.initialize();
      this.currentAPIClient = this.openRouterClient;
    }
  }
}

// Export singleton instance
export const nerServiceManager = new NERServiceManager();
