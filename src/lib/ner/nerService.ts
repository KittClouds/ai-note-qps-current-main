
import { pipeline, env } from '@huggingface/transformers';

// Type declarations
export interface NEREntity {
  value: string;   // surface text
  type: string;    // predicted label
  start: number;   // char start
  end: number;     // char end
}

export interface NERResult {
  entities: NEREntity[];
  totalCount: number;
  entityTypes: Record<string, number>;
}

const MODEL_ID = 'onnx-community/gliner_small-v2.1';
type CandidateLabels = string[];

// Default entity labels for GLiNER
const DEFAULT_LABELS: CandidateLabels = [
  'PERSON',
  'ORGANIZATION', 
  'LOCATION',
  'DATE',
  'MONEY',
  'PRODUCT',
  'EVENT',
  'WORK_OF_ART',
  'LAW',
  'LANGUAGE'
];

/**
 * Singleton wrapper around the Transformers.js token-classification pipeline.
 * GLiNER expects an additional `labels` input for zero-shot entity recognition.
 */
class NERService {
  private classifier: any = null;
  private initialized = false;
  private loading = false;

  constructor() {
    // Lazy loading - actual loading happens in init() on first call
  }

  private async init() {
    if (this.initialized || this.loading) return;
    this.loading = true;

    try {
      // Configure environment for better performance
      env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency ?? 4;

      this.classifier = await pipeline(
        'token-classification',
        MODEL_ID,
        { 
          device: 'webgpu' // Try WebGPU first, fallback to WASM
        }
      );

      this.initialized = true;
      console.info('[NER] GLiNER pipeline ready');
    } catch (err) {
      console.error('[NER] Failed to initialize:', err);
      this.initialized = false;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Extract entities for given text using specified labels.
   * Uses default labels if none provided.
   */
  public async extractEntities(
    text: string,
    labels: CandidateLabels = DEFAULT_LABELS
  ): Promise<NERResult> {
    if (!text?.trim()) {
      return { entities: [], totalCount: 0, entityTypes: {} };
    }

    // Ensure model is loaded
    await this.init();
    if (!this.initialized || !this.classifier) {
      return { entities: [], totalCount: 0, entityTypes: {} };
    }

    try {
      const raw = (await this.classifier(text, {
        // GLiNER-specific parameter
        labels,
        // Return character positions for editor integration
        ignoreLabels: [], // Keep all predictions
      })) as Array<{
        word: string;
        entity: string;
        start: number;
        end: number;
        score: number;
      }>;

      const entities: NEREntity[] = [];
      const entityTypes: Record<string, number> = {};

      for (const r of raw) {
        entities.push({
          value: r.word,
          type: r.entity,
          start: r.start,
          end: r.end,
        });
        entityTypes[r.entity] = (entityTypes[r.entity] || 0) + 1;
      }

      return {
        entities,
        totalCount: entities.length,
        entityTypes,
      };
    } catch (err) {
      console.error('[NER] Inference error:', err);
      return { entities: [], totalCount: 0, entityTypes: {} };
    }
  }

  // Public status methods
  public isInitialized(): boolean {
    return this.initialized;
  }

  public isLoading(): boolean {
    return this.loading;
  }
}

// Export singleton instance
export const nerService = new NERService();
export type { CandidateLabels };
