
import React from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CalendarIcon, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TypedAttributeInputProps {
  type: string;
  value: any;
  onChange: (value: any) => void;
  entityKind?: string;
  entityLabel?: string;
}

export function TypedAttributeInput({ 
  type, 
  value, 
  onChange, 
  entityKind, 
  entityLabel 
}: TypedAttributeInputProps) {
  
  const handleListChange = (index: number, newValue: string) => {
    const currentList = Array.isArray(value) ? value : [];
    const newList = [...currentList];
    newList[index] = newValue;
    onChange(newList);
  };

  const handleAddListItem = () => {
    const currentList = Array.isArray(value) ? value : [];
    onChange([...currentList, '']);
  };

  const handleRemoveListItem = (index: number) => {
    const currentList = Array.isArray(value) ? value : [];
    const newList = currentList.filter((_, i) => i !== index);
    onChange(newList);
  };

  switch (type) {
    case 'Text':
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 text-xs"
          placeholder="Enter text"
        />
      );

    case 'Number':
      return (
        <Input
          type="number"
          value={value || 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-6 text-xs"
          placeholder="Enter number"
        />
      );

    case 'Boolean':
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={!!value}
            onCheckedChange={onChange}
          />
          <span className="text-xs">{value ? 'True' : 'False'}</span>
        </div>
      );

    case 'Date':
      return (
        <Input
          type="datetime-local"
          value={value ? new Date(value).toISOString().slice(0, 16) : ''}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
          className="h-6 text-xs"
        />
      );

    case 'List':
      const listValue = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-1">
          {listValue.map((item, index) => (
            <div key={index} className="flex gap-1">
              <Input
                value={item}
                onChange={(e) => handleListChange(index, e.target.value)}
                className="h-6 text-xs flex-1"
                placeholder={`Item ${index + 1}`}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveListItem(index)}
                className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddListItem}
            className="h-6 w-full border-dashed border hover:bg-primary/10"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Item
          </Button>
        </div>
      );

    case 'URL':
      return (
        <Input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 text-xs"
          placeholder="https://example.com"
        />
      );

    default:
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs min-h-[60px]"
          placeholder="Enter value"
        />
      );
  }
}
