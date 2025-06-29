// Updated parsing utilities for TipTap schema integration
import { NEREntity } from '@/lib/ner/nerServiceManager';

export interface Entity {
  kind: string;
  label: string;
  attributes?: Record<string, any>;
}

export interface Triple {
  id?: string;
  subject: Entity;
  predicate: string;
  object: Entity;
}

export interface ParsedConnections {
  tags: string[];
  mentions: string[];
  links: string[]; // Stores link titles
  entities: Entity[];
  triples: Triple[];
  backlinks: string[]; // Stores backlink titles from <<title>> - THESE ARE DISPLAY-ONLY
  nerEntities?: NEREntity[]; // Add NER entities from all providers (Gemini, OpenRouter, Wink)
}

// Helper to extract text from TipTap JSON node recursively
function extractTextFromTipTapNode(node: any): string {
  let text = '';
  
  // If node has text property (text nodes)
  if (node.text) {
    text += node.text;
  }
  
  // If node has content array (block nodes with inline content)
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      text += extractTextFromTipTapNode(child);
    }
  }
  
  return text;
}

// Helper to extract text from TipTap JSON document
function extractTextFromTipTapDocument(doc: any): string {
  if (!doc || !doc.content) return '';
  
  let fullText = '';
  
  for (const node of doc.content) {
    fullText += extractTextFromTipTapNode(node) + '\n';
  }
  
  return fullText;
}

// New schema-based parsing for TipTap documents
function parseConnectionsFromTipTapDocument(document: any): ParsedConnections {
  const connections: ParsedConnections = {
    tags: [],
    mentions: [],
    links: [],
    entities: [],
    triples: [],
    backlinks: []
  };

  const walkNode = (node: any) => {
    // Process marks (tags, mentions, links, backlinks)
    if (node.marks && Array.isArray(node.marks)) {
      node.marks.forEach((mark: any) => {
        switch (mark.type) {
          case 'tag':
            if (mark.attrs?.tag) {
              connections.tags.push(mark.attrs.tag);
            }
            break;
          case 'mention':
            if (mark.attrs?.id) {
              connections.mentions.push(mark.attrs.id);
            }
            break;
          case 'link':
            if (mark.attrs?.href) {
              // Extract title from wiki link href
              const match = mark.attrs.href.match(/\/wiki\/(.+)/);
              if (match) {
                connections.links.push(decodeURIComponent(match[1]));
              }
            }
            break;
          case 'backlink':
            if (mark.attrs?.target) {
              connections.backlinks.push(mark.attrs.target);
            }
            break;
        }
      });
    }

    // Process nodes (entities, triples)
    if (node.type) {
      switch (node.type) {
        case 'entity':
          if (node.attrs?.kind && node.attrs?.label) {
            connections.entities.push({
              kind: node.attrs.kind,
              label: node.attrs.label,
              attributes: node.attrs.attributes
            });
          }
          break;
        case 'triple':
          if (node.attrs?.subject && node.attrs?.predicate && node.attrs?.object) {
            connections.triples.push({
              subject: node.attrs.subject,
              predicate: node.attrs.predicate,
              object: node.attrs.object
            });
          }
          break;
      }
    }
    
    // Recursively process content array (nested nodes)
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(walkNode);
    }
  };

  // Walk through the document content
  if (document && document.content && Array.isArray(document.content)) {
    document.content.forEach(walkNode);
  }
  
  // Remove duplicates
  connections.tags = [...new Set(connections.tags)];
  connections.mentions = [...new Set(connections.mentions)];
  connections.links = [...new Set(connections.links)];
  connections.backlinks = [...new Set(connections.backlinks)];
  
  return connections;
}

// Convert tags to CONCEPT entities for unified entity promotion
function promoteTagsToEntities(tags: string[]): Entity[] {
  return tags.map(tag => ({
    kind: 'CONCEPT',
    label: tag
  }));
}

// Convert mentions to MENTION entities for unified entity promotion
function promoteMentionsToEntities(mentions: string[]): Entity[] {
  return mentions.map(mention => ({
    kind: 'MENTION',
    label: mention
  }));
}

export function parseNoteConnections(content: any): ParsedConnections {
  // Handle different content formats
  if (typeof content === 'string') {
    try {
      // Try to parse as JSON first
      const jsonContent = JSON.parse(content);
      return parseConnectionsFromTipTapDocument(jsonContent);
    } catch {
      // If not JSON, return empty connections
      return { tags: [], mentions: [], links: [], entities: [], triples: [], backlinks: [] };
    }
  } else if (content && typeof content === 'object') {
    // If content is TipTap JSON document
    return parseConnectionsFromTipTapDocument(content);
  }

  return { tags: [], mentions: [], links: [], entities: [], triples: [], backlinks: [] };
}

// Function to parse all notes and return maps
export function parseAllNotes(notes: { id: string; content: any; type?: string }[]): {
  tagsMap: Map<string, string[]>;
  mentionsMap: Map<string, string[]>;
  linksMap: Map<string, string[]>; // Map note ID to link *titles*
  entitiesMap: Map<string, Entity[]>; // Map note ID to entities
  triplesMap: Map<string, Triple[]>; // Map note ID to triples
  backlinksMap: Map<string, string[]>; // Map note ID to backlink titles
} {
  const tagsMap = new Map<string, string[]>();
  const mentionsMap = new Map<string, string[]>();
  const linksMap = new Map<string, string[]>();
  const entitiesMap = new Map<string, Entity[]>();
  const triplesMap = new Map<string, Triple[]>();
  const backlinksMap = new Map<string, string[]>();

  notes.forEach(note => {
    // Only parse actual notes; folders/other types get empty arrays
    if (!note.type || note.type === 'note') {
      const connections = parseNoteConnections(note.content);
      tagsMap.set(note.id, connections.tags);
      mentionsMap.set(note.id, connections.mentions);
      linksMap.set(note.id, connections.links);
      entitiesMap.set(note.id, connections.entities);
      triplesMap.set(note.id, connections.triples);
      backlinksMap.set(note.id, connections.backlinks);
    } else {
      tagsMap.set(note.id, []);
      mentionsMap.set(note.id, []);
      linksMap.set(note.id, []);
      entitiesMap.set(note.id, []);
      triplesMap.set(note.id, []);
      backlinksMap.set(note.id, []);
    }
  });

  return { tagsMap, mentionsMap, linksMap, entitiesMap, triplesMap, backlinksMap };
}
