import { NEREntity, NERResult } from './nerServiceManager';

// Comprehensive entity types with BIO tagging
export const NER_ENTITY_TYPES = [
  'O', // Outside of any named entity
  'B-CARDINAL', 'I-CARDINAL', // Cardinal numbers
  'B-DATE', 'I-DATE', // Dates
  'B-EVENT', 'I-EVENT', // Events
  'B-FAC', 'I-FAC', // Facilities
  'B-GPE', 'I-GPE', // Geopolitical entities
  'B-LANGUAGE', 'I-LANGUAGE', // Languages
  'B-LAW', 'I-LAW', // Laws and legal documents
  'B-LOC', 'I-LOC', // Non-GPE locations
  'B-MONEY', 'I-MONEY', // Monetary values
  'B-NORP', 'I-NORP', // Nationalities/religious/political groups
  'B-ORDINAL', 'I-ORDINAL', // Ordinal numbers
  'B-ORG', 'I-ORG', // Organizations
  'B-PERCENT', 'I-PERCENT', // Percentages
  'B-PERSON', 'I-PERSON', // Person names
  'B-PRODUCT', 'I-PRODUCT', // Products
  'B-QUANTITY', 'I-QUANTITY', // Quantities
  'B-TIME', 'I-TIME', // Time expressions
  'B-WORK_OF_ART', 'I-WORK_OF_ART', // Works of art
] as const;

export type NEREntityType = typeof NER_ENTITY_TYPES[number];

// Core NER configuration
export interface NERConfig {
  temperature?: number;
  maxTokens?: number;
  confidenceThreshold?: number;
}

export const DEFAULT_NER_CONFIG: NERConfig = {
  temperature: 0.1, // Low temperature for consistent entity extraction
  maxTokens: 4096,
  confidenceThreshold: 0.5,
};

// Structured output schema for all providers
export const NER_OUTPUT_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      value: {
        type: 'string',
        description: 'The exact text of the entity'
      },
      type: {
        type: 'string',
        description: 'The entity type using BIO tagging',
        enum: NER_ENTITY_TYPES
      },
      start: {
        type: 'integer',
        description: 'Start position in text'
      },
      end: {
        type: 'integer',
        description: 'End position in text'
      },
      confidence: {
        type: 'number',
        description: 'Confidence score between 0 and 1'
      }
    },
    required: ['value', 'type', 'start', 'end', 'confidence']
  }
} as const;

/**
 * Core NER Service - Centralized NER logic, prompts, and processing
 */
export class CoreNERService {
  
  /**
   * Create an empty NER result
   */
  public createEmptyResult(): NERResult {
    return {
      entities: [],
      totalCount: 0,
      entityTypes: {},
      processingTime: 0,
      textLength: 0
    };
  }

  /**
   * Generate standardized NER prompt for any provider
   */
  public generateNERPrompt(text: string): string {
    return `Analyze the following text and extract named entities using BIO tagging. Return only valid entities with their exact positions in the text.

Text: "${text}"

Extract entities of these types:
- O: Outside of any named entity (e.g., "the", "is")
- B-CARDINAL: Beginning of a cardinal number (e.g., "1000")
- B-DATE: Beginning of a date (e.g., "January")
- B-EVENT: Beginning of an event (e.g., "Olympics")
- B-FAC: Beginning of a facility (e.g., "Eiffel Tower")
- B-GPE: Beginning of a geopolitical entity (e.g., "Tokyo")
- B-LANGUAGE: Beginning of a language (e.g., "Spanish")
- B-LAW: Beginning of a law or legal document (e.g., "Constitution")
- B-LOC: Beginning of a non-GPE location (e.g., "Pacific Ocean")
- B-MONEY: Beginning of a monetary value (e.g., "$100")
- B-NORP: Beginning of a nationality/religious/political group (e.g., "Democrat")
- B-ORDINAL: Beginning of an ordinal number (e.g., "first")
- B-ORG: Beginning of an organization (e.g., "Microsoft")
- B-PERCENT: Beginning of a percentage (e.g., "50%")
- B-PERSON: Beginning of a person's name (e.g., "Elon Musk")
- B-PRODUCT: Beginning of a product (e.g., "iPhone")
- B-QUANTITY: Beginning of a quantity (e.g., "two liters")
- B-TIME: Beginning of a time (e.g., "noon")
- B-WORK_OF_ART: Beginning of a work of art (e.g., "Mona Lisa")
- I-CARDINAL: Inside of a cardinal number (e.g., "000" in "1000")
- I-DATE: Inside of a date (e.g., "2025" in "January 2025")
- I-EVENT: Inside of an event name
- I-FAC: Inside of a facility name
- I-GPE: Inside of a geopolitical entity
- I-LANGUAGE: Inside of a language name
- I-LAW: Inside of a legal document title
- I-LOC: Inside of a location
- I-MONEY: Inside of a monetary value
- I-NORP: Inside of a NORP entity
- I-ORDINAL: Inside of an ordinal number
- I-ORG: Inside of an organization name
- I-PERCENT: Inside of a percentage
- I-PERSON: Inside of a person's name
- I-PRODUCT: Inside of a product name
- I-QUANTITY: Inside of a quantity
- I-TIME: Inside of a time phrase
- I-WORK_OF_ART: Inside of a work of art title

For each entity, provide:
- value: the exact text as it appears
- type: one of the types above
- start: character position where entity starts
- end: character position where entity ends
- confidence: your confidence level (0.0 to 1.0)`;
  }

  /**
   * Process and validate entities from any provider response
   */
  public processEntities(entities: NEREntity[], originalText: string, config: NERConfig = DEFAULT_NER_CONFIG): NERResult {
    const startTime = Date.now();
    
    console.log('[CoreNER] Processing entities:', entities.length);
    
    // Validate entities
    const validEntities = entities.filter(entity => this.validateEntity(entity, originalText));
    
    // Remove duplicates
    const uniqueEntities = this.removeDuplicateEntities(validEntities);
    
    // Apply confidence threshold
    const filteredEntities = uniqueEntities.filter(entity => 
      entity.confidence && entity.confidence >= (config.confidenceThreshold || 0.5)
    );
    
    // Calculate entity type counts
    const entityTypes = filteredEntities.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const processingTime = Date.now() - startTime;
    
    console.log(`[CoreNER] Processing completed in ${processingTime}ms`);
    console.log(`[CoreNER] Found ${filteredEntities.length} valid entities`);
    
    return {
      entities: filteredEntities,
      totalCount: filteredEntities.length,
      entityTypes,
      processingTime,
      textLength: originalText.length
    };
  }

  /**
   * Validate individual entity
   */
  private validateEntity(entity: NEREntity, originalText: string): boolean {
    const isValid = entity.value && 
                   entity.type && 
                   typeof entity.start === 'number' && 
                   typeof entity.end === 'number' &&
                   entity.start >= 0 && 
                   entity.end <= originalText.length &&
                   entity.start < entity.end &&
                   typeof entity.confidence === 'number' &&
                   entity.confidence >= 0 &&
                   entity.confidence <= 1;
    
    if (!isValid) {
      console.warn('[CoreNER] Invalid entity filtered out:', entity);
    }
    
    return isValid;
  }

  /**
   * Remove duplicate entities based on value, type, start, and end positions
   */
  private removeDuplicateEntities(entities: NEREntity[]): NEREntity[] {
    const seen = new Set<string>();
    return entities.filter(entity => {
      const key = `${entity.value}-${entity.type}-${entity.start}-${entity.end}`;
      if (seen.has(key)) {
        console.log('[CoreNER] Removing duplicate entity:', entity);
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Parse entities from JSON response content
   */
  public parseEntitiesFromJSON(content: string, originalText: string): NEREntity[] {
    try {
      const entities = JSON.parse(content) as NEREntity[];
      return Array.isArray(entities) ? entities : [];
    } catch (error) {
      console.error('[CoreNER] Failed to parse JSON response:', error);
      return [];
    }
  }
}

// Export singleton instance
export const coreNERService = new CoreNERService();
