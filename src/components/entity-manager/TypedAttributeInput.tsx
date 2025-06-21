
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { X, Plus } from 'lucide-react';
import { AttributeType, AttributeValue, EntityReference, ProgressBarValue, StatBlockValue, RelationshipValue } from '@/types/attributes';

interface TypedAttributeInputProps {
  type: AttributeType;
  value: AttributeValue;
  onChange: (value: AttributeValue) => void;
  entityKind: string;
  entityLabel: string;
}

export function TypedAttributeInput({ 
  type, 
  value, 
  onChange, 
  entityKind, 
  entityLabel 
}: TypedAttributeInputProps) {
  const [listInput, setListInput] = useState('');

  const handleListAdd = () => {
    if (!listInput.trim()) return;
    const currentList = Array.isArray(value) ? value : [];
    onChange([...currentList, listInput.trim()]);
    setListInput('');
  };

  const handleListRemove = (index: number) => {
    const currentList = Array.isArray(value) ? value : [];
    onChange(currentList.filter((_, i) => i !== index));
  };

  const formatDateForInput = (dateValue: AttributeValue): string => {
    if (!dateValue) return '';
    const date = new Date(dateValue as string);
    return date.toISOString().split('T')[0];
  };

  switch (type) {
    case 'ProgressBar':
      const progressValue = (value as ProgressBarValue) || { current: 0, maximum: 100 };
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Current</label>
              <Input
                type="number"
                value={progressValue.current}
                onChange={(e) => onChange({
                  ...progressValue,
                  current: Number(e.target.value) || 0
                })}
                className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Maximum</label>
              <Input
                type="number"
                value={progressValue.maximum}
                onChange={(e) => onChange({
                  ...progressValue,
                  maximum: Number(e.target.value) || 100
                })}
                className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Slider
              value={[progressValue.current]}
              max={progressValue.maximum}
              step={1}
              onValueChange={(values) => onChange({
                ...progressValue,
                current: values[0]
              })}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-center">
              {Math.round((progressValue.current / progressValue.maximum) * 100)}%
            </div>
          </div>
        </div>
      );

    case 'StatBlock':
      const statValue = (value as StatBlockValue) || { 
        strength: 10, dexterity: 10, constitution: 10, 
        intelligence: 10, wisdom: 10, charisma: 10 
      };
      return (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(statValue).map(([stat, val]) => (
            <div key={stat} className="space-y-1">
              <label className="text-xs text-muted-foreground capitalize">{stat}</label>
              <Input
                type="number"
                value={val}
                onChange={(e) => onChange({
                  ...statValue,
                  [stat]: Number(e.target.value) || 10
                })}
                className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
                min={1}
                max={20}
              />
            </div>
          ))}
        </div>
      );

    case 'Relationship':
      const relationshipValue = (value as RelationshipValue) || { 
        entityId: '', entityLabel: '', relationshipType: '' 
      };
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">Entity</label>
            <Input
              value={relationshipValue.entityLabel}
              onChange={(e) => onChange({
                ...relationshipValue,
                entityLabel: e.target.value,
                entityId: `entity-${e.target.value.toLowerCase().replace(/\s+/g, '-')}`
              })}
              className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
              placeholder="Entity name"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Relationship Type</label>
            <Input
              value={relationshipValue.relationshipType}
              onChange={(e) => onChange({
                ...relationshipValue,
                relationshipType: e.target.value
              })}
              className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
              placeholder="ally, enemy, parent, etc."
            />
          </div>
        </div>
      );

    case 'Text':
      return (
        <Input
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
          placeholder="Enter text value"
        />
      );

    case 'Number':
      return (
        <Input
          type="number"
          value={String(value || '')}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
          placeholder="Enter number"
        />
      );

    case 'Boolean':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(Boolean(checked))}
            className="data-[state=checked]:bg-primary"
          />
          <span className="text-xs text-muted-foreground">
            {Boolean(value) ? 'True' : 'False'}
          </span>
        </div>
      );

    case 'Date':
      return (
        <Input
          type="date"
          value={formatDateForInput(value)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
          className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
        />
      );

    case 'List':
      const currentList = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={listInput}
              onChange={(e) => setListInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleListAdd()}
              className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23] flex-1"
              placeholder="Add list item"
            />
            <Button
              size="sm"
              onClick={handleListAdd}
              disabled={!listInput.trim()}
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {currentList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentList.map((item, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs flex items-center gap-1 bg-[#1a1b23] hover:bg-[#22242f]"
                >
                  {String(item)}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleListRemove(index)}
                    className="h-3 w-3 p-0 hover:bg-red-900/20 hover:text-red-400"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      );

    case 'EntityLink':
      const entityRef = (value as EntityReference) || { id: '', label: '', kind: '' };
      return (
        <div className="space-y-2">
          <Input
            value={entityRef.label || ''}
            onChange={(e) => onChange({
              ...entityRef,
              label: e.target.value,
              id: `entity-${e.target.value.toLowerCase().replace(/\s+/g, '-')}`
            })}
            className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
            placeholder="Entity name or reference"
          />
          <Input
            value={entityRef.kind || ''}
            onChange={(e) => onChange({
              ...entityRef,
              kind: e.target.value.toUpperCase()
            })}
            className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
            placeholder="Entity type (CHARACTER, NPC, etc.)"
          />
        </div>
      );

    case 'URL':
      return (
        <Input
          type="url"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
          placeholder="https://example.com"
        />
      );

    default:
      return (
        <Input
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs bg-[#0a0a0d] border-[#1a1b23]"
          placeholder="Enter value"
        />
      );
  }
}
