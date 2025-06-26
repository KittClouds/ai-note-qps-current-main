
import { nerService as huggingFaceService, NEREntity, NERResult, NERStatus, ModelInfo } from './nerService';
import { winkService } from './winkService';

export type NERProvider = 'huggingface' | 'wink';

export const AVAILABLE_MODELS: (ModelInfo & { provider: NERProvider })[] = [
  {
    id: 'onnx-community/NeuroBERT-NER-ONNX',
    name: 'NeuroBERT NER',
    description: 'NeuroBERT optimized for NER tasks',
    provider: 'huggingface'
  },
  {
    id: 'wink-eng-lite-web-model',
    name: 'Wink English Lite',
    description: 'Lightweight English NER model',
    provider: 'wink'
  }
];

class NERManager {
  private currentProvider: NERProvider = 'huggingface';
  private currentModelId = AVAILABLE_MODELS[0].id;

  constructor() {
    console.log('[NERManager] Manager initialized');
  }

  public async switchModel(modelId: string): Promise<void> {
    console.log('[NERManager] Switching to model:', modelId);
    
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    this.currentProvider = model.provider;
    this.currentModelId = modelId;

    // Initialize the target service
    if (this.currentProvider === 'huggingface') {
      await huggingFaceService.switchModel(modelId);
    } else {
      // Wink service doesn't need model switching as it uses a fixed model
      await winkService.reinitialize();
    }
  }

  public async extractEntities(text: string): Promise<NERResult> {
    if (this.currentProvider === 'huggingface') {
      return huggingFaceService.extractEntities(text);
    } else {
      return winkService.extractEntities(text);
    }
  }

  public getStatus(): NERStatus {
    if (this.currentProvider === 'huggingface') {
      return huggingFaceService.getStatus();
    } else {
      return winkService.getStatus();
    }
  }

  public getCurrentModel(): ModelInfo | null {
    const model = AVAILABLE_MODELS.find(m => m.id === this.currentModelId);
    return model ? {
      id: model.id,
      name: model.name,
      description: model.description
    } : null;
  }

  public getAvailableModels(): ModelInfo[] {
    return AVAILABLE_MODELS.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description
    }));
  }

  public getCurrentProvider(): NERProvider {
    return this.currentProvider;
  }

  public isInitialized(): boolean {
    if (this.currentProvider === 'huggingface') {
      return huggingFaceService.isInitialized();
    } else {
      return winkService.isInitialized();
    }
  }

  public isLoading(): boolean {
    if (this.currentProvider === 'huggingface') {
      return huggingFaceService.isLoading();
    } else {
      return winkService.isLoading();
    }
  }

  public hasErrors(): boolean {
    if (this.currentProvider === 'huggingface') {
      return huggingFaceService.hasErrors();
    } else {
      return winkService.hasErrors();
    }
  }

  public getErrorMessage(): string {
    if (this.currentProvider === 'huggingface') {
      return huggingFaceService.getErrorMessage();
    } else {
      return winkService.getErrorMessage();
    }
  }

  public async reinitialize(): Promise<void> {
    if (this.currentProvider === 'huggingface') {
      return huggingFaceService.reinitialize();
    } else {
      return winkService.reinitialize();
    }
  }
}

export const nerManager = new NERManager();
export type { NEREntity, NERResult, NERStatus, ModelInfo };
