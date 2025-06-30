
export interface KnowledgeTriple {
  subject: KnowledgeEntity;
  predicate: string;
  object: KnowledgeEntity;
  confidence?: number;
  source?: string;
}

export interface KnowledgeEntity {
  id: string;
  value: string;
  type: string;
  confidence?: number;
  start?: number;
  end?: number;
}

export interface KnowledgeGraph {
  entities: KnowledgeEntity[];
  triples: KnowledgeTriple[];
  totalEntities: number;
  totalTriples: number;
  processingTime?: number;
  textLength?: number;
}

export interface EntityFactSheet {
  entity: KnowledgeEntity;
  factsAbout: KnowledgeTriple[]; // Where entity is the subject
  factsRelated: KnowledgeTriple[]; // Where entity is the object
  relatedEntities: KnowledgeEntity[];
}

export type KnowledgeGraphViewState = 'initial' | 'loading' | 'entity-list' | 'fact-sheet';

export interface KnowledgeGraphState {
  view: KnowledgeGraphViewState;
  knowledgeGraph: KnowledgeGraph | null;
  selectedEntity: KnowledgeEntity | null;
  factSheet: EntityFactSheet | null;
  status: string;
  error: string | null;
}
