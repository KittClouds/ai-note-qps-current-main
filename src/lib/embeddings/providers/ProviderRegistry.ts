
import { EmbeddingProvider } from './EmbeddingProvider';
import { HuggingFaceProvider } from './HuggingFaceProvider';
import { GeminiProvider } from './GeminiProvider';
import { NomicProvider } from './NomicProvider';

export class ProviderRegistry {
  private providers = new Map<string, EmbeddingProvider>();
  private activeProvider: string | null = null;

  constructor() {
    // Register available providers
    this.registerProvider('huggingface', new HuggingFaceProvider());
    this.registerProvider('gemini', new GeminiProvider());
    this.registerProvider('nomic', new NomicProvider()); // Now properly using Nomic model
    
    // Set default provider
    this.activeProvider = 'huggingface';
  }

  registerProvider(id: string, provider: EmbeddingProvider): void {
    this.providers.set(id, provider);
  }

  getProvider(id?: string): EmbeddingProvider | null {
    const providerId = id || this.activeProvider;
    return providerId ? this.providers.get(providerId) || null : null;
  }

  getActiveProvider(): EmbeddingProvider | null {
    return this.getProvider();
  }

  async setActiveProvider(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider '${id}' not found`);
    }

    // Dispose current provider
    const currentProvider = this.getActiveProvider();
    if (currentProvider) {
      currentProvider.dispose();
    }

    // Initialize new provider
    await provider.initialize();
    this.activeProvider = id;
    
    // Store preference
    localStorage.setItem('active_embedding_provider', id);
  }

  getAvailableProviders(): Array<{ id: string; provider: EmbeddingProvider }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({ id, provider }));
  }

  getActiveProviderId(): string | null {
    return this.activeProvider;
  }

  async initializeFromStorage(): Promise<void> {
    const storedProvider = localStorage.getItem('active_embedding_provider');
    if (storedProvider && this.providers.has(storedProvider)) {
      try {
        await this.setActiveProvider(storedProvider);
      } catch (error) {
        console.warn(`Failed to initialize stored provider '${storedProvider}', falling back to default`);
        await this.setActiveProvider('huggingface');
      }
    } else {
      await this.setActiveProvider('huggingface');
    }
  }
}

export const providerRegistry = new ProviderRegistry();
