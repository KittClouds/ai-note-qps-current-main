export interface TextChunk {
  text: string;
  metadata: Record<string, any>;
}

/**
 * Split text into chunks with overlap for better context preservation
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50,
  metadata: Record<string, any> = {}
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanText = text.trim();
  const chunks: TextChunk[] = [];
  
  // For short texts, return as single chunk
  if (cleanText.length <= chunkSize) {
    return [{
      text: cleanText,
      metadata: { ...metadata, chunkIndex: 0, totalChunks: 1 }
    }];
  }

  let start = 0;
  let chunkIndex = 0;

  while (start < cleanText.length) {
    let end = Math.min(start + chunkSize, cleanText.length);
    
    // Try to end at a sentence boundary if possible
    if (end < cleanText.length) {
      const sentenceEnd = cleanText.lastIndexOf('.', end);
      const paragraphEnd = cleanText.lastIndexOf('\n', end);
      const spaceEnd = cleanText.lastIndexOf(' ', end);
      
      // Use the latest boundary that's not too far back
      const bestEnd = Math.max(sentenceEnd, paragraphEnd, spaceEnd);
      if (bestEnd > start + chunkSize * 0.7) {
        end = bestEnd + 1;
      }
    }
    
    const chunkText = cleanText.slice(start, end).trim();
    
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        metadata: {
          ...metadata,
          chunkIndex,
          startPosition: start,
          endPosition: end,
          totalChunks: 0 // Will be updated after all chunks are created
        }
      });
    }
    
    // Move start position with overlap
    start = Math.max(start + chunkSize - overlap, end);
    chunkIndex++;
  }

  // Update total chunks count
  chunks.forEach(chunk => {
    chunk.metadata.totalChunks = chunks.length;
  });

  return chunks;
}

/**
 * Extract text content from TipTap JSON document
 */
export function extractTextFromTipTapDocument(doc: any): string {
  if (!doc || !doc.content) return '';
  
  function extractFromNode(node: any): string {
    let text = '';
    
    // If node has text property (text nodes)
    if (node.text) {
      text += node.text;
    }
    
    // If node has content array (block nodes with inline content)
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        text += extractFromNode(child);
      }
    }
    
    // Add newlines for paragraph breaks
    if (node.type === 'paragraph' || node.type === 'heading') {
      text += '\n';
    }
    
    return text;
  }
  
  let fullText = '';
  for (const node of doc.content) {
    fullText += extractFromNode(node);
  }
  
  return fullText.trim();
}

/**
 * Preprocess text for embedding generation
 */
export function preprocessText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s\.,!?;:-]/g, '') // Remove special characters but keep basic punctuation
    .trim();
}

/**
 * Create chunks from note content for embedding
 */
export function createNoteChunks(
  noteId: string,
  title: string,
  content: string,
  chunkSize: number = 500,
  overlap: number = 50
): TextChunk[] {
  let textContent: string;
  
  try {
    // Try to parse as TipTap JSON
    const contentObj = typeof content === 'string' ? JSON.parse(content) : content;
    textContent = extractTextFromTipTapDocument(contentObj);
  } catch {
    // Fallback to treating as plain text
    textContent = typeof content === 'string' ? content : '';
  }
  
  // Combine title and content
  const fullText = `${title}\n\n${textContent}`;
  const processedText = preprocessText(fullText);
  
  return chunkText(processedText, chunkSize, overlap, {
    noteId,
    title,
    type: 'note'
  });
}

import { semanticChunker } from './semanticChunking';
import { SemanticChunkingOptions } from './semanticChunkingConfig';
import { parseSentences } from './sentenceParser';

/**
 * Create semantic chunks using similarity-based chunking
 */
export async function chunkitSemantic(
  text: string,
  options: SemanticChunkingOptions & { 
    chunkSize?: number; 
    metadata?: Record<string, any> 
  } = {}
): Promise<TextChunk[]> {
  const { chunkSize = 500, metadata = {}, ...semanticOptions } = options;
  
  const documents = [{
    document_text: text,
    document_name: metadata.title || 'Document'
  }];

  const semanticChunks = await semanticChunker.chunkit(documents, {
    ...semanticOptions,
    maxTokenSize: chunkSize,
    returnTokenLength: true
  });

  return semanticChunks.map((chunk, index) => ({
    text: chunk.text,
    metadata: {
      ...metadata,
      chunkIndex: index,
      totalChunks: semanticChunks.length,
      semanticScore: chunk.token_length || 0,
      chunkNumber: chunk.chunk_number,
      documentId: chunk.document_id
    }
  }));
}

/**
 * Create basic chunks without semantic similarity (size-based only)
 */
export async function cramitBasic(
  text: string,
  options: SemanticChunkingOptions & { 
    chunkSize?: number; 
    metadata?: Record<string, any> 
  } = {}
): Promise<TextChunk[]> {
  const { chunkSize = 500, metadata = {}, ...semanticOptions } = options;
  
  const documents = [{
    document_text: text,
    document_name: metadata.title || 'Document'
  }];

  const chunks = await semanticChunker.cramit(documents, {
    ...semanticOptions,
    maxTokenSize: chunkSize,
    returnTokenLength: true
  });

  return chunks.map((chunk, index) => ({
    text: chunk.text,
    metadata: {
      ...metadata,
      chunkIndex: index,
      totalChunks: chunks.length,
      tokenLength: chunk.token_length || 0,
      chunkNumber: chunk.chunk_number,
      documentId: chunk.document_id
    }
  }));
}

/**
 * Split text into individual sentences
 */
export async function sentenceitSplit(
  text: string,
  options: SemanticChunkingOptions & { metadata?: Record<string, any> } = {}
): Promise<TextChunk[]> {
  const { metadata = {}, ...semanticOptions } = options;
  
  const documents = [{
    document_text: text,
    document_name: metadata.title || 'Document'
  }];

  const sentences = await semanticChunker.sentenceit(documents, {
    ...semanticOptions,
    returnTokenLength: true
  });

  return sentences.map((sentence, index) => ({
    text: sentence.text,
    metadata: {
      ...metadata,
      sentenceIndex: index,
      totalSentences: sentences.length,
      tokenLength: sentence.token_length || 0,
      sentenceNumber: sentence.chunk_number,
      documentId: sentence.document_id
    }
  }));
}

/**
 * Enhanced note chunking with semantic options
 */
export async function createNoteChunksSemantic(
  noteId: string,
  title: string,
  content: string,
  chunkingMethod: 'semantic' | 'basic' | 'sentences' = 'semantic',
  options: SemanticChunkingOptions & { chunkSize?: number; overlap?: number } = {}
): Promise<TextChunk[]> {
  let textContent: string;
  
  try {
    // Try to parse as TipTap JSON
    const contentObj = typeof content === 'string' ? JSON.parse(content) : content;
    textContent = extractTextFromTipTapDocument(contentObj);
  } catch {
    // Fallback to treating as plain text
    textContent = typeof content === 'string' ? content : '';
  }
  
  // Combine title and content
  const fullText = `${title}\n\n${textContent}`;
  const processedText = preprocessText(fullText);
  
  const baseMetadata = {
    noteId,
    title,
    type: 'note'
  };

  // Choose chunking method
  switch (chunkingMethod) {
    case 'semantic':
      return await chunkitSemantic(processedText, {
        ...options,
        metadata: baseMetadata
      });
    case 'basic':
      return await cramitBasic(processedText, {
        ...options,
        metadata: baseMetadata
      });
    case 'sentences':
      return await sentenceitSplit(processedText, {
        ...options,
        metadata: baseMetadata
      });
    default:
      // Fallback to original chunking method
      return chunkText(processedText, options.chunkSize || 500, options.overlap || 50, baseMetadata);
  }
}
