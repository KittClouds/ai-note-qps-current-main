
import { Mark } from '@tiptap/core';

// Helper function for entity styling with enhanced pattern-based entities
function getEntityStyle(entityType: string): string {
  const styles: Record<string, string> = {
    // Standard entities
    'PERSON': 'background-color: #e3f2fd; color: #1565c0; border-radius: 3px; padding: 1px 3px;',
    'ORGANIZATION': 'background-color: #e8f5e8; color: #2e7d32; border-radius: 3px; padding: 1px 3px;',
    'LOCATION': 'background-color: #fff3e0; color: #ef6c00; border-radius: 3px; padding: 1px 3px;',
    'DATE': 'background-color: #f3e5f5; color: #7b1fa2; border-radius: 3px; padding: 1px 3px;',
    'MONEY': 'background-color: #e0f2f1; color: #00695c; border-radius: 3px; padding: 1px 3px;',
    'PRODUCT': 'background-color: #fce4ec; color: #c2185b; border-radius: 3px; padding: 1px 3px;',
    'EVENT': 'background-color: #e8eaf6; color: #3f51b5; border-radius: 3px; padding: 1px 3px;',
    'WORK_OF_ART': 'background-color: #f1f8e9; color: #689f38; border-radius: 3px; padding: 1px 3px;',
    'LAW': 'background-color: #fff8e1; color: #f57c00; border-radius: 3px; padding: 1px 3px;',
    'LANGUAGE': 'background-color: #fafafa; color: #424242; border-radius: 3px; padding: 1px 3px;',
    
    // Enhanced pattern-based entities
    'PROJECT': 'background-color: #e1f5fe; color: #0277bd; border-radius: 3px; padding: 1px 3px; border-left: 3px solid #0277bd;',
    'TICKET': 'background-color: #fff3e0; color: #f57c00; border-radius: 3px; padding: 1px 3px; border-left: 3px solid #f57c00;',
    
    // Default style
    'default': 'background-color: #f5f5f5; color: #424242; border-radius: 3px; padding: 1px 3px;'
  };
  
  return styles[entityType] || styles.default;
}

// Helper function to determine if entity is from custom patterns
function isCustomPatternEntity(entityType: string): boolean {
  const customEntityTypes = ['PROJECT', 'TICKET'];
  return customEntityTypes.includes(entityType);
}

export const NERHighlight = Mark.create({
  name: 'nerHighlight',

  addAttributes() {
    return {
      entityType: {
        default: null,
        parseHTML: element => element.getAttribute('data-entity-type'),
        renderHTML: attributes => {
          if (!attributes.entityType) {
            return {};
          }
          return {
            'data-entity-type': attributes.entityType,
          };
        },
      },
      entityValue: {
        default: null,
        parseHTML: element => element.getAttribute('data-entity-value'),
        renderHTML: attributes => {
          if (!attributes.entityValue) {
            return {};
          }
          return {
            'data-entity-value': attributes.entityValue,
          };
        },
      },
      confidence: {
        default: null,
        parseHTML: element => element.getAttribute('data-confidence'),
        renderHTML: attributes => {
          if (!attributes.confidence) {
            return {};
          }
          return {
            'data-confidence': attributes.confidence,
          };
        },
      },
      isCustomPattern: {
        default: false,
        parseHTML: element => element.getAttribute('data-custom-pattern') === 'true',
        renderHTML: attributes => {
          return {
            'data-custom-pattern': attributes.isCustomPattern ? 'true' : 'false',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-entity-type]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const entityType = HTMLAttributes.entityType || 'unknown';
    const confidence = HTMLAttributes.confidence || 0;
    const isCustom = HTMLAttributes.isCustomPattern || isCustomPatternEntity(entityType);
    
    const baseClass = 'ner-highlight';
    const typeClass = `ner-${entityType.toLowerCase()}`;
    const customClass = isCustom ? 'ner-custom-pattern' : '';
    
    return [
      'mark',
      {
        ...HTMLAttributes,
        class: `${baseClass} ${typeClass} ${customClass}`.trim(),
        style: getEntityStyle(entityType),
        title: `${entityType}${confidence ? ` (${Math.round(confidence * 100)}%)` : ''}${isCustom ? ' - Custom Pattern' : ''}`,
      },
      0,
    ];
  },
});
