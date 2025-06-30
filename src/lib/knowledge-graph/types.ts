
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

export interface AdvancedCentralityMetrics {
  id: string;
  degree: number;
  pageRank: number;
  betweenness: number;
  closeness: number;
}

export interface GraphCluster {
  id: string;
  nodes: string[];
  modularity?: number;
  type?: 'structural' | 'type-based' | 'community';
}

export interface HierarchicalStructure {
  rootNodes: string[];
  maxDepth: number;
  compoundRelations: Array<{ parent: string; children: string[] }>;
}

export interface EnhancedGraphAnalysis {
  centralNodes: AdvancedCentralityMetrics[];
  clusters: GraphCluster[];
  pathsBetween: (source: string, target: string) => string[];
  subgraph: (nodeIds: string[]) => any;
  hierarchicalStructure: HierarchicalStructure;
}

export type KnowledgeGraphViewState = 'initial' | 'loading' | 'entity-list' | 'fact-sheet' | 'graph-analysis';

export interface KnowledgeGraphState {
  view: KnowledgeGraphViewState;
  knowledgeGraph: KnowledgeGraph | null;
  selectedEntity: KnowledgeEntity | null;
  factSheet: EntityFactSheet | null;
  graphAnalysis?: EnhancedGraphAnalysis | null;
  status: string;
  error: string | null;
}
