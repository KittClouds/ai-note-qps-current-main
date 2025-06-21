
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Check, XCircle, Database, User } from 'lucide-react';
import { TypedAttribute, AttributeType, AttributeValue, ENTITY_SCHEMAS } from '@/types/attributes';
import { TypedAttributeInput } from './TypedAttributeInput';

interface SchemaEntityAttributesProps {
  attributes: Record<string, any>;
  onAttributesChange: (attributes: Record<string, any>) => void;
  entityKind: string;
  entityLabel: string;
}

export function SchemaEntityAttributes({ 
  attributes, 
  onAttributesChange, 
  entityKind, 
  entityLabel 
}: SchemaEntityAttributesProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newAttribute, setNewAttribute] = useState({
    name: '',
    type: 'Text' as AttributeType,
    value: '' as any,
    unit: ''
  });

  // Get schema for this entity kind
  const entitySchema = ENTITY_SCHEMAS.find(schema => schema.kind === entityKind);

  // Organize attributes into schema and custom
  const { schemaAttributes, customAttributes } = useMemo(() => {
    const validatedAttributes = attributes && typeof attributes === 'object' ? attributes : {};
    const schemaAttrNames = new Set(entitySchema?.attributes.map(attr => attr.name) || []);
    
    const schema: Record<string, any> = {};
    const custom: Record<string, any> = {};
    
    // Add schema attributes (with defaults if missing)
    if (entitySchema) {
      entitySchema.attributes.forEach(schemaAttr => {
        if (validatedAttributes.hasOwnProperty(schemaAttr.name)) {
          schema[schemaAttr.name] = validatedAttributes[schemaAttr.name];
        } else {
          schema[schemaAttr.name] = schemaAttr.defaultValue;
        }
      });
    }
    
    // Add custom attributes
    Object.entries(validatedAttributes).forEach(([key, value]) => {
      if (!schemaAttrNames.has(key)) {
        custom[key] = value;
      }
    });
    
    return { schemaAttributes: schema, customAttributes: custom };
  }, [attributes, entitySchema]);

  const getDefaultValueForType = (type: AttributeType): any => {
    switch (type) {
      case 'ProgressBar': return { current: 100, maximum: 100 };
      case 'StatBlock': return { 
        strength: 10, dexterity: 10, constitution: 10, 
        intelligence: 10, wisdom: 10, charisma: 10 
      };
      case 'Relationship': return { entityId: '', entityLabel: '', relationshipType: '' };
      case 'Text': return '';
      case 'Number': return 0;
      case 'Boolean': return false;
      case 'Date': return new Date().toISOString();
      case 'List': return [];
      case 'EntityLink': return { id: '', label: '', kind: '' };
      case 'URL': return '';
      default: return '';
    }
  };

  const handleUpdateAttribute = (key: string, value: any) => {
    const updatedAttributes = {
      ...schemaAttributes,
      ...customAttributes,
      [key]: value
    };
    onAttributesChange(updatedAttributes);
    setEditingKey(null);
  };

  const handleAddAttribute = () => {
    if (!newAttribute.name.trim()) return;

    const updatedAttributes = {
      ...schemaAttributes,
      ...customAttributes,
      [newAttribute.name.trim()]: newAttribute.value || getDefaultValueForType(newAttribute.type)
    };

    onAttributesChange(updatedAttributes);
    setNewAttribute({ name: '', type: 'Text', value: '', unit: '' });
    setIsAddingNew(false);
  };

  const handleDeleteAttribute = (key: string) => {
    const updatedAttributes = { ...schemaAttributes, ...customAttributes };
    delete updatedAttributes[key];
    onAttributesChange(updatedAttributes);
  };

  const getTypeColor = (type: AttributeType): string => {
    const colors: Record<AttributeType, string> = {
      Text: 'bg-blue-500/20 text-blue-400',
      Number: 'bg-green-500/20 text-green-400',
      Boolean: 'bg-purple-500/20 text-purple-400',
      Date: 'bg-orange-500/20 text-orange-400',
      List: 'bg-yellow-500/20 text-yellow-400',
      EntityLink: 'bg-pink-500/20 text-pink-400',
      URL: 'bg-cyan-500/20 text-cyan-400',
      ProgressBar: 'bg-emerald-500/20 text-emerald-400',
      StatBlock: 'bg-indigo-500/20 text-indigo-400',
      Relationship: 'bg-rose-500/20 text-rose-400'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  const detectAttributeType = (value: any, schemaType?: AttributeType): AttributeType => {
    if (schemaType) return schemaType;
    
    if (typeof value === 'boolean') return 'Boolean';
    if (typeof value === 'number') return 'Number';
    if (Array.isArray(value)) return 'List';
    if (typeof value === 'object' && value?.current !== undefined) return 'ProgressBar';
    if (typeof value === 'object' && value?.strength !== undefined) return 'StatBlock';
    if (typeof value === 'string') {
      if (value.match(/^\d{4}-\d{2}-\d{2}/) || !isNaN(Date.parse(value))) return 'Date';
      if (value.startsWith('http://') || value.startsWith('https://')) return 'URL';
    }
    return 'Text';
  };

  const formatAttributeValue = (value: any, type: AttributeType): string => {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'Boolean':
        return value ? 'true' : 'false';
      case 'Date':
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return String(value);
        }
      case 'List':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'ProgressBar':
        return `${value?.current || 0}/${value?.maximum || 100}`;
      case 'StatBlock':
        return `STR:${value?.strength || 10}`;
      case 'EntityLink':
        return value?.label || 'No link';
      default:
        return String(value);
    }
  };

  const renderAttributeCard = (key: string, value: any, isSchema: boolean = false) => {
    const schemaAttr = entitySchema?.attributes.find(attr => attr.name === key);
    const type = detectAttributeType(value, schemaAttr?.type);
    
    return (
      <Card key={key} className="bg-[#12141f] border-[#1a1b23]">
        <CardContent className="p-3">
          {editingKey === key ? (
            <div className="space-y-2">
              <TypedAttributeInput
                type={type}
                value={value}
                onChange={(newValue) => handleUpdateAttribute(key, newValue)}
                entityKind={entityKind}
                entityLabel={entityLabel}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setEditingKey(null)}
                  className="h-6 px-2 text-xs"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingKey(null)}
                  className="h-6 px-2 text-xs hover:bg-red-900/20 hover:text-red-400"
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-xs ${getTypeColor(type)}`}>
                    {type}
                  </Badge>
                  {isSchema && (
                    <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                      Schema
                    </Badge>
                  )}
                  <span className="text-xs font-medium text-white">
                    {key}
                    {schemaAttr?.unit && ` (${schemaAttr.unit})`}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatAttributeValue(value, type)}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingKey(key)}
                  className="h-6 w-6 p-0 hover:bg-blue-900/20 hover:text-blue-400"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                {!isSchema && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAttribute(key)}
                    className="h-6 w-6 p-0 hover:bg-red-900/20 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {/* Schema Attributes */}
      {Object.keys(schemaAttributes).length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-purple-300 flex items-center gap-2">
            <Database className="h-3 w-3" />
            Schema Attributes
          </h5>
          {Object.entries(schemaAttributes).map(([key, value]) => 
            renderAttributeCard(key, value, true)
          )}
        </div>
      )}

      {/* Custom Attributes */}
      {Object.keys(customAttributes).length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-blue-300 flex items-center gap-2">
            <User className="h-3 w-3" />
            Custom Attributes
          </h5>
          {Object.entries(customAttributes).map(([key, value]) => 
            renderAttributeCard(key, value, false)
          )}
        </div>
      )}

      {/* Add New Attribute */}
      {isAddingNew ? (
        <Card className="bg-[#12141f] border-[#1a1b23] border-dashed">
          <CardContent className="p-3 space-y-2">
            <Input
              value={newAttribute.name}
              onChange={(e) => setNewAttribute({ ...newAttribute, name: e.target.value })}
              className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
              placeholder="Attribute name"
            />
            <div className="flex gap-2">
              <Select
                value={newAttribute.type}
                onValueChange={(type: AttributeType) => 
                  setNewAttribute({ ...newAttribute, type, value: getDefaultValueForType(type) })
                }
              >
                <SelectTrigger className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Text">Text</SelectItem>
                  <SelectItem value="Number">Number</SelectItem>
                  <SelectItem value="Boolean">Boolean</SelectItem>
                  <SelectItem value="Date">Date</SelectItem>
                  <SelectItem value="List">List</SelectItem>
                  <SelectItem value="EntityLink">Entity Link</SelectItem>
                  <SelectItem value="URL">URL</SelectItem>
                  <SelectItem value="ProgressBar">Progress Bar</SelectItem>
                  <SelectItem value="StatBlock">Stat Block</SelectItem>
                  <SelectItem value="Relationship">Relationship</SelectItem>
                </SelectContent>
              </Select>
              {newAttribute.type === 'Number' && (
                <Input
                  value={newAttribute.unit}
                  onChange={(e) => setNewAttribute({ ...newAttribute, unit: e.target.value })}
                  className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23] w-20"
                  placeholder="Unit"
                />
              )}
            </div>
            <TypedAttributeInput
              type={newAttribute.type}
              value={newAttribute.value}
              onChange={(value) => setNewAttribute({ ...newAttribute, value })}
              entityKind={entityKind}
              entityLabel={entityLabel}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddAttribute}
                disabled={!newAttribute.name.trim()}
                className="h-6 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewAttribute({ name: '', type: 'Text', value: '', unit: '' });
                }}
                className="h-6 px-2 text-xs hover:bg-red-900/20 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="ghost"
          onClick={() => setIsAddingNew(true)}
          className="w-full h-8 border-dashed border border-[#1a1b23] hover:bg-[#12141f] text-muted-foreground hover:text-white"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Custom Attribute
        </Button>
      )}
    </div>
  );
}
