import { KnowledgeGraph, KnowledgeEntity, KnowledgeTriple, EntityFactSheet } from './types';
import { coreNERService } from '../ner/coreNERService';
import { graphFileService } from './graphFileService';
import { cytoscapeGraphModel } from './cytoscapeGraphModel';
import { Note } from '@/types/notes';
import { ParsedConnections } from '@/utils/parsingUtils';

export const KNOWLEDGE_GRAPH_SCHEMA = {
  type: 'object',
  properties: {
    entities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier for the entity' },
          value: { type: 'string', description: 'The exact text of the entity' },
          type: { type: 'string', description: 'The entity type (PERSON, ORG, etc.)' },
          confidence: { type: 'number', description: 'Confidence score between 0 and 1' },
          start: { type: 'integer', description: 'Start position in text' },
          end: { type: 'integer', description: 'End position in text' }
        },
        required: ['id', 'value', 'type']
      }
    },
    triples: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subject: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              value: { type: 'string' },
              type: { type: 'string' }
            },
            required: ['id', 'value', 'type']
          },
          predicate: { type: 'string', description: 'The relationship type' },
          object: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              value: { type: 'string' },
              type: { type: 'string' }
            },
            required: ['id', 'value', 'type']
          },
          confidence: { type: 'number', description: 'Confidence score between 0 and 1' }
        },
        required: ['subject', 'predicate', 'object']
      }
    }
  },
  required: ['entities', 'triples']
} as const;

export class KnowledgeGraphService {
  
  /**
   * Generate knowledge graph extraction prompt
   */
  public generateKnowledgeGraphPrompt(text: string): string {
    return `Analyze the following text and extract a complete knowledge graph including both entities and their relationships.

Text: "${text}"

Your task:
1. Identify all important entities (people, organizations, places, dates, events, concepts, etc.)
2. Extract all meaningful relationships between these entities as triples (subject, predicate, object)
3. Assign confidence scores based on how clear the relationship is in the text

Guidelines:
- Each entity should have a unique ID, exact text value, and appropriate type
- Relationships should be factual and directly supported by the text
- Use clear, descriptive predicates (e.g., "is CEO of", "was founded in", "is located in")
- Include position information when available
- Assign confidence scores between 0.0 and 1.0

Return the results as a structured JSON object with "entities" and "triples" arrays.`;
  }

  /**
   * Process raw knowledge graph data and generate computational graph
   */
  public async processKnowledgeGraph(
    rawData: any, 
    originalText: string, 
    note?: Note,
    connections?: ParsedConnections & { crosslinks: Array<{ noteId: string; label: string }> }
  ): Promise<KnowledgeGraph> {
    const startTime = Date.now();
    
    console.log('[KnowledgeGraph] Processing raw data:', rawData);
    
    // Validate and process entities
    const entities: KnowledgeEntity[] = (rawData.entities || [])
      .filter((entity: any) => this.validateEntity(entity))
      .map((entity: any) => ({
        id: entity.id || `entity_${Math.random().toString(36).substr(2, 9)}`,
        value: entity.value,
        type: entity.type,
        confidence: entity.confidence || 0.8,
        start: entity.start,
        end: entity.end
      }));

    // Validate and process triples
    const triples: KnowledgeTriple[] = (rawData.triples || [])
      .filter((triple: any) => this.validateTriple(triple))
      .map((triple: any) => ({
        subject: {
          id: triple.subject.id || `entity_${Math.random().toString(36).substr(2, 9)}`,
          value: triple.subject.value,
          type: triple.subject.type,
          confidence: triple.subject.confidence || 0.8
        },
        predicate: triple.predicate,
        object: {
          id: triple.object.id || `entity_${Math.random().toString(36).substr(2, 9)}`,
          value: triple.object.value,
          type: triple.object.type,
          confidence: triple.object.confidence || 0.8
        },
        confidence: triple.confidence || 0.8
      }));

    const processingTime = Date.now() - startTime;
    
    const knowledgeGraph: KnowledgeGraph = {
      entities,
      triples,
      totalEntities: entities.length,
      totalTriples: triples.length,
      processingTime,
      textLength: originalText.length
    };

    // Generate computational graph file if note and connections are provided
    if (note && connections) {
      try {
        await graphFileService.generateNoteGraphFile(note, knowledgeGraph, connections);
        console.log('[KnowledgeGraph] Computational graph file generated for note:', note.title);
      } catch (error) {
        console.error('[KnowledgeGraph] Failed to generate graph file:', error);
      }
    }
    
    console.log(`[KnowledgeGraph] Processing completed in ${processingTime}ms`);
    console.log(`[KnowledgeGraph] Found ${entities.length} entities and ${triples.length} triples`);
    
    return knowledgeGraph;
  }

  /**
   * Generate fact sheet for a specific entity
   */
  public generateEntityFactSheet(entity: KnowledgeEntity, knowledgeGraph: KnowledgeGraph): EntityFactSheet {
    const factsAbout = knowledgeGraph.triples.filter(triple => 
      triple.subject.id === entity.id || triple.subject.value === entity.value
    );
    
    const factsRelated = knowledgeGraph.triples.filter(triple => 
      triple.object.id === entity.id || triple.object.value === entity.value
    );

    // Get all related entities
    const relatedEntityIds = new Set<string>();
    
    factsAbout.forEach(triple => {
      relatedEntityIds.add(triple.object.id);
    });
    
    factsRelated.forEach(triple => {
      relatedEntityIds.add(triple.subject.id);
    });

    const relatedEntities = knowledgeGraph.entities.filter(e => 
      relatedEntityIds.has(e.id) && e.id !== entity.id
    );

    return {
      entity,
      factsAbout,
      factsRelated,
      relatedEntities
    };
  }

  /**
   * Parse knowledge graph from JSON response
   */
  public parseKnowledgeGraphFromJSON(content: string): any {
    try {
      const data = JSON.parse(content);
      return data;
    } catch (error) {
      console.error('[KnowledgeGraph] Failed to parse JSON response:', error);
      return { entities: [], triples: [] };
    }
  }

  /**
   * Create empty knowledge graph
   */
  public createEmptyKnowledgeGraph(): KnowledgeGraph {
    return {
      entities: [],
      triples: [],
      totalEntities: 0,
      totalTriples: 0,
      processingTime: 0,
      textLength: 0
    };
  }

  private validateEntity(entity: any): boolean {
    return entity.value && entity.type && typeof entity.value === 'string' && typeof entity.type === 'string';
  }

  private validateTriple(triple: any): boolean {
    return triple.subject && 
           triple.predicate && 
           triple.object &&
           this.validateEntity(triple.subject) &&
           this.validateEntity(triple.object) &&
           typeof triple.predicate === 'string';
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
