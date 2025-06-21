
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Check, XCircle } from 'lucide-react';
import { TypedAttributeInput } from './TypedAttributeInput';

interface EnhancedEntityAttributesProps {
  attributes: Record<string, any>;
  onAttributesChange: (attributes: Record<string, any>) => void;
  entityKind: string;
  entityLabel: string;
}

export function EnhancedEntityAttributes({ 
  attributes, 
  onAttributesChange, 
  entityKind, 
  entityLabel 
}: EnhancedEntityAttributesProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newAttribute, setNewAttribute] = useState({
    name: '',
    type: 'Text',
    value: '',
    unit: ''
  });

  // Validate and normalize attributes
  const validatedAttributes = React.useMemo(() => {
    console.log('EnhancedEntityAttributes: Raw attributes:', attributes);
    
    // Handle case where attributes might be a string or invalid
    if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
      console.log('EnhancedEntityAttributes: Invalid attributes, returning empty object');
      return {};
    }
    
    // Filter out any non-serializable values and ensure we have valid key-value pairs
    const validated: Record<string, any> = {};
    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof key === 'string' && key.length > 0) {
        validated[key] = value;
      }
    });
    
    console.log('EnhancedEntityAttributes: Validated attributes:', validated);
    return validated;
  }, [attributes]);

  const getDefaultValueForType = (type: string): any => {
    switch (type) {
      case 'Text': return '';
      case 'Number': return 0;
      case 'Boolean': return false;
      case 'Date': return new Date().toISOString();
      case 'List': return [];
      case 'URL': return '';
      default: return '';
    }
  };

  const handleAddAttribute = () => {
    if (!newAttribute.name.trim()) return;

    const updatedAttributes = {
      ...validatedAttributes,
      [newAttribute.name.trim()]: newAttribute.value || getDefaultValueForType(newAttribute.type)
    };

    console.log('EnhancedEntityAttributes: Adding attribute:', updatedAttributes);
    onAttributesChange(updatedAttributes);
    setNewAttribute({ name: '', type: 'Text', value: '', unit: '' });
    setIsAddingNew(false);
  };

  const handleUpdateAttribute = (key: string, value: any) => {
    const updatedAttributes = {
      ...validatedAttributes,
      [key]: value
    };
    console.log('EnhancedEntityAttributes: Updating attribute:', updatedAttributes);
    onAttributesChange(updatedAttributes);
    setEditingKey(null);
  };

  const handleDeleteAttribute = (key: string) => {
    const updatedAttributes = { ...validatedAttributes };
    delete updatedAttributes[key];
    console.log('EnhancedEntityAttributes: Deleting attribute:', updatedAttributes);
    onAttributesChange(updatedAttributes);
  };

  const getTypeColor = (type: string): string => {
    const colors = {
      Text: 'bg-blue-500/20 text-blue-400',
      Number: 'bg-green-500/20 text-green-400',
      Boolean: 'bg-purple-500/20 text-purple-400',
      Date: 'bg-orange-500/20 text-orange-400',
      List: 'bg-yellow-500/20 text-yellow-400',
      URL: 'bg-cyan-500/20 text-cyan-400'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  const formatAttributeValue = (value: any, type: string = 'Text'): string => {
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
      default:
        return String(value);
    }
  };

  const detectAttributeType = (value: any): string => {
    if (typeof value === 'boolean') return 'Boolean';
    if (typeof value === 'number') return 'Number';
    if (Array.isArray(value)) return 'List';
    if (typeof value === 'string') {
      // Check if it's a date
      if (value.match(/^\d{4}-\d{2}-\d{2}/) || !isNaN(Date.parse(value))) {
        return 'Date';
      }
      // Check if it's a URL
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return 'URL';
      }
    }
    return 'Text';
  };

  const renderAttributeCard = (key: string, value: any) => {
    const detectedType = detectAttributeType(value);
    
    return (
      <Card key={key} className="bg-background/50 border-border/50">
        <CardContent className="p-2">
          {editingKey === key ? (
            <div className="space-y-2">
              <TypedAttributeInput
                type={detectedType}
                value={value}
                onChange={(newValue) => handleUpdateAttribute(key, newValue)}
                entityKind={entityKind}
                entityLabel={entityLabel}
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => setEditingKey(null)}
                  className="h-5 px-2 text-xs"
                >
                  <Check className="h-2 w-2" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingKey(null)}
                  className="h-5 px-2 text-xs hover:bg-destructive/20 hover:text-destructive"
                >
                  <XCircle className="h-2 w-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <Badge className={`text-xs ${getTypeColor(detectedType)}`}>
                    {detectedType}
                  </Badge>
                  <span className="text-xs font-medium">{key}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatAttributeValue(value, detectedType)}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingKey(key)}
                  className="h-5 w-5 p-0 hover:bg-primary/20 hover:text-primary"
                >
                  <Edit2 className="h-2 w-2" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteAttribute(key)}
                  className="h-5 w-5 p-0 hover:bg-destructive/20 hover:text-destructive"
                >
                  <X className="h-2 w-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const attributeKeys = Object.keys(validatedAttributes);

  return (
    <div className="space-y-2">
      {attributeKeys.length > 0 && (
        <div className="space-y-2">
          {attributeKeys.map((key) => 
            renderAttributeCard(key, validatedAttributes[key])
          )}
        </div>
      )}

      {isAddingNew ? (
        <Card className="border-dashed border-primary/50">
          <CardContent className="p-2 space-y-2">
            <Input
              value={newAttribute.name}
              onChange={(e) => setNewAttribute({ ...newAttribute, name: e.target.value })}
              className="h-6 text-xs"
              placeholder="Attribute name"
            />
            <Select
              value={newAttribute.type}
              onValueChange={(type) => 
                setNewAttribute({ ...newAttribute, type, value: getDefaultValueForType(type) })
              }
            >
              <SelectTrigger className="h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Text">Text</SelectItem>
                <SelectItem value="Number">Number</SelectItem>
                <SelectItem value="Boolean">Boolean</SelectItem>
                <SelectItem value="Date">Date</SelectItem>
                <SelectItem value="List">List</SelectItem>
                <SelectItem value="URL">URL</SelectItem>
              </SelectContent>
            </Select>
            <TypedAttributeInput
              type={newAttribute.type}
              value={newAttribute.value}
              onChange={(value) => setNewAttribute({ ...newAttribute, value })}
              entityKind={entityKind}
              entityLabel={entityLabel}
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleAddAttribute}
                disabled={!newAttribute.name.trim()}
                className="h-5 px-2 text-xs"
              >
                <Check className="h-2 w-2 mr-1" />
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewAttribute({ name: '', type: 'Text', value: '', unit: '' });
                }}
                className="h-5 px-2 text-xs hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="h-2 w-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="ghost"
          onClick={() => setIsAddingNew(true)}
          className="w-full h-6 border-dashed border hover:bg-primary/10 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-2 w-2 mr-1" />
          Add Custom Attribute
        </Button>
      )}
    </div>
  );
}
