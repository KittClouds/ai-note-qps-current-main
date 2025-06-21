
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
      { name: 'health', type: 'ProgressBar', defaultValue: { current: 100, maximum: 100 } },
      { name: 'mana', type: 'ProgressBar', defaultValue: { current: 50, maximum: 50 } },
      { name: 'stats', type: 'StatBlock', defaultValue: { 
        strength: 10, 
        dexterity: 10, 
        constitution: 10, 
        intelligence: 10, 
        wisdom: 10, 
        charisma: 10 
      }}
    ]
  },
  {
    kind: 'FACTION',
    attributes: [
      { name: 'influence', type: 'ProgressBar', defaultValue: { current: 0, maximum: 100 } },
      { name: 'territory', type: 'List', defaultValue: [] },
      { name: 'leader', type: 'Text', defaultValue: '' },
      { name: 'power', type: 'Number', defaultValue: 0 }
    ]
  }
];
