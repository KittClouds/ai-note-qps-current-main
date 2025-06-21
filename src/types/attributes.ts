
export type AttributeType = 
  | 'Text' 
  | 'Number' 
  | 'Boolean' 
  | 'Date' 
  | 'List' 
  | 'EntityLink' 
  | 'URL' 
  | 'ProgressBar' 
  | 'StatBlock' 
  | 'Relationship';

export type AttributeValue = 
  | string 
  | number 
  | boolean 
  | Date 
  | string[] 
  | EntityReference 
  | ProgressBarValue 
  | StatBlockValue 
  | RelationshipValue;

export interface TypedAttribute {
  id: string;
  name: string;
  type: AttributeType;
  value: AttributeValue;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressBarValue {
  current: number;
  maximum: number;
}

export interface StatBlockValue {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface RelationshipValue {
  entityId: string;
  entityLabel: string;
  relationshipType: string;
}

export interface EntityReference {
  id: string;
  label: string;
  kind: string;
}

export interface EntitySchemaAttribute {
  name: string;
  type: AttributeType;
  defaultValue: any;
  unit?: string;
}

export interface EntitySchema {
  kind: string;
  attributes: EntitySchemaAttribute[];
}

export const ENTITY_SCHEMAS: EntitySchema[] = [
  {
    kind: 'CHARACTER',
    attributes: [
      { name: 'level', type: 'Number', defaultValue: 1 },
      { name: 'class', type: 'Text', defaultValue: '' },
      { name: 'race', type: 'Text', defaultValue: '' },
      { name: 'alignment', type: 'Text', defaultValue: 'Neutral' },
      { name: 'health', type: 'ProgressBar', defaultValue: { current: 100, maximum: 100 } },
      { name: 'mana', type: 'ProgressBar', defaultValue: { current: 50, maximum: 50 } },
      { name: 'stats', type: 'StatBlock', defaultValue: { 
        strength: 10, dexterity: 10, constitution: 10, 
        intelligence: 10, wisdom: 10, charisma: 10 
      }},
      { name: 'background', type: 'Text', defaultValue: '' },
      { name: 'occupation', type: 'Text', defaultValue: '' },
      { name: 'faction', type: 'EntityLink', defaultValue: { id: '', label: '', kind: 'FACTION' } }
    ]
  },
  {
    kind: 'NPC',
    attributes: [
      { name: 'role', type: 'Text', defaultValue: '' },
      { name: 'attitude', type: 'Text', defaultValue: 'Neutral' },
      { name: 'importance', type: 'Number', defaultValue: 5 },
      { name: 'location', type: 'EntityLink', defaultValue: { id: '', label: '', kind: 'LOCATION' } },
      { name: 'faction', type: 'EntityLink', defaultValue: { id: '', label: '', kind: 'FACTION' } },
      { name: 'relationships', type: 'List', defaultValue: [] },
      { name: 'secrets', type: 'List', defaultValue: [] },
      { name: 'goals', type: 'Text', defaultValue: '' },
      { name: 'description', type: 'Text', defaultValue: '' }
    ]
  },
  {
    kind: 'LOCATION',
    attributes: [
      { name: 'type', type: 'Text', defaultValue: '' },
      { name: 'size', type: 'Text', defaultValue: 'Medium' },
      { name: 'population', type: 'Number', defaultValue: 0 },
      { name: 'danger_level', type: 'Number', defaultValue: 1 },
      { name: 'climate', type: 'Text', defaultValue: '' },
      { name: 'terrain', type: 'Text', defaultValue: '' },
      { name: 'notable_features', type: 'List', defaultValue: [] },
      { name: 'resources', type: 'List', defaultValue: [] },
      { name: 'controlling_faction', type: 'EntityLink', defaultValue: { id: '', label: '', kind: 'FACTION' } },
      { name: 'connected_locations', type: 'List', defaultValue: [] }
    ]
  },
  {
    kind: 'SCENE',
    attributes: [
      { name: 'type', type: 'Text', defaultValue: 'Roleplay' },
      { name: 'difficulty', type: 'Number', defaultValue: 1 },
      { name: 'duration', type: 'Number', defaultValue: 30, unit: 'minutes' },
      { name: 'location', type: 'EntityLink', defaultValue: { id: '', label: '', kind: 'LOCATION' } },
      { name: 'participants', type: 'List', defaultValue: [] },
      { name: 'objectives', type: 'List', defaultValue: [] },
      { name: 'rewards', type: 'List', defaultValue: [] },
      { name: 'consequences', type: 'Text', defaultValue: '' },
      { name: 'mood', type: 'Text', defaultValue: '' },
      { name: 'tension', type: 'Number', defaultValue: 5 }
    ]
  },
  {
    kind: 'ITEM',
    attributes: [
      { name: 'type', type: 'Text', defaultValue: 'Miscellaneous' },
      { name: 'rarity', type: 'Text', defaultValue: 'Common' },
      { name: 'value', type: 'Number', defaultValue: 0, unit: 'gold' },
      { name: 'weight', type: 'Number', defaultValue: 1, unit: 'lbs' },
      { name: 'magical', type: 'Boolean', defaultValue: false },
      { name: 'damage', type: 'Text', defaultValue: '' },
      { name: 'armor_class', type: 'Number', defaultValue: 0 },
      { name: 'properties', type: 'List', defaultValue: [] },
      { name: 'attunement', type: 'Boolean', defaultValue: false },
      { name: 'owner', type: 'EntityLink', defaultValue: { id: '', label: '', kind: 'CHARACTER' } },
      { name: 'location', type: 'EntityLink', defaultValue: { id: '', label: '', kind: 'LOCATION' } }
    ]
  },
  {
    kind: 'FACTION',
    attributes: [
      { name: 'type', type: 'Text', defaultValue: 'Organization' },
      { name: 'alignment', type: 'Text', defaultValue: 'Neutral' },
      { name: 'influence', type: 'ProgressBar', defaultValue: { current: 50, maximum: 100 } },
      { name: 'resources', type: 'ProgressBar', defaultValue: { current: 50, maximum: 100 } },
      { name: 'territory', type: 'List', defaultValue: [] },
      { name: 'leader', type: 'EntityLink', defaultValue: { id: '', label: '', kind: 'NPC' } },
      { name: 'goals', type: 'List', defaultValue: [] },
      { name: 'enemies', type: 'List', defaultValue: [] },
      { name: 'allies', type: 'List', defaultValue: [] },
      { name: 'reputation', type: 'Number', defaultValue: 0 }
    ]
  },
  {
    kind: 'EVENT',
    attributes: [
      { name: 'type', type: 'Text', defaultValue: 'Plot' },
      { name: 'status', type: 'Text', defaultValue: 'Planned' },
      { name: 'date', type: 'Date', defaultValue: new Date().toISOString() },
      { name: 'location', type: 'EntityLink', defaultValue: { id: '', label: '', kind: 'LOCATION' } },
      { name: 'participants', type: 'List', defaultValue: [] },
      { name: 'consequences', type: 'List', defaultValue: [] },
      { name: 'triggers', type: 'List', defaultValue: [] },
      { name: 'importance', type: 'Number', defaultValue: 5 },
      { name: 'related_events', type: 'List', defaultValue: [] },
      { name: 'outcome', type: 'Text', defaultValue: '' }
    ]
  }
];
