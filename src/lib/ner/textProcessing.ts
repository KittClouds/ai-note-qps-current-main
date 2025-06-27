
// Enhanced utility functions to extract plain text from TipTap JSON documents
// Now powered by Wink NLP for better NER preprocessing

// @ts-ignore - We'll handle the import dynamically
let winkNLP: any = null;
let model: any = null;
let winkUtils: any = null;

// Dynamic import to handle potential loading issues
async function loadWinkNLP() {
  try {
    const winkModule = await import('wink-nlp');
    const modelModule = await import('wink-eng-lite-web-model');
    const utilsModule = await import('wink-nlp-utils');
    
    winkNLP = winkModule.default || winkModule;
    model = modelModule.default || modelModule;
    winkUtils = utilsModule;
    return true;
  } catch (error) {
    console.warn('Failed to load wink-nlp modules:', error);
    return false;
  }
}

// Initialize Wink NLP instance
let nlpInstance: any = null;
async function getWinkInstance() {
  if (!nlpInstance) {
    const loaded = await loadWinkNLP();
    if (loaded && winkNLP && model) {
      nlpInstance = winkNLP(model, ['tokenization', 'sbd', 'negation', 'sentiment']);
    }
  }
  return nlpInstance;
}

/**
 * Extract text from a single TipTap JSON node recursively
 */
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

/**
 * Extract plain text from TipTap JSON document with better formatting
 */
export function extractPlainTextFromTipTap(doc: any): string {
  if (!doc || !doc.content) {
    console.warn('[TextProcessing] Invalid TipTap document structure');
    return '';
  }
  
  let fullText = '';
  
  for (const node of doc.content) {
    const nodeText = extractTextFromTipTapNode(node);
    
    if (nodeText.trim()) {
      fullText += nodeText;
      
      // Add appropriate spacing between different block types
      if (node.type === 'paragraph' || node.type === 'heading') {
        fullText += '\n';
      } else if (node.type === 'listItem') {
        fullText += ' ';
      }
    }
  }
  
  // Clean up excessive whitespace while preserving sentence structure
  return fullText
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/[ \t]{2,}/g, ' ') // Multiple spaces become single space
    .trim();
}

/**
 * Extract text from note content with comprehensive error handling
 */
export function extractTextFromNoteContent(content: any): string {
  console.log('[TextProcessing] Extracting text from content type:', typeof content);
  
  if (!content) {
    console.warn('[TextProcessing] No content provided');
    return '';
  }
  
  if (typeof content === 'string') {
    try {
      // Try to parse as JSON first
      const jsonContent = JSON.parse(content);
      console.log('[TextProcessing] Parsed JSON content successfully');
      return extractPlainTextFromTipTap(jsonContent);
    } catch (parseError) {
      // If not JSON, treat as plain text
      console.log('[TextProcessing] Content is plain text, not JSON');
      return content.trim();
    }
  } else if (content && typeof content === 'object') {
    // If content is already an object (TipTap JSON)
    console.log('[TextProcessing] Content is already a TipTap object');
    return extractPlainTextFromTipTap(content);
  }
  
  console.warn('[TextProcessing] Unhandled content type:', typeof content);
  return '';
}

/**
 * NER-specific text preparation using Wink NLP
 */
export interface NERTextPreparation {
  cleanText: string;
  entityHints: Array<{ value: string; type: string; start: number; end: number }>;
  sentences: string[];
  tokens: string[];
  metadata: {
    wordCount: number;
    sentenceCount: number;
    hasProperNouns: boolean;
    confidence: number;
  };
}

/**
 * Prepare text specifically for NER analysis using Wink NLP
 */
export async function prepareTextForNER(text: string): Promise<NERTextPreparation> {
  const nlp = await getWinkInstance();
  
  if (!nlp || !text?.trim()) {
    return {
      cleanText: text || '',
      entityHints: [],
      sentences: text ? [text.trim()] : [],
      tokens: [],
      metadata: {
        wordCount: 0,
        sentenceCount: 0,
        hasProperNouns: false,
        confidence: 0
      }
    };
  }

  try {
    // Initial cleaning using Wink utilities
    let cleanedText = text;
    if (winkUtils) {
      if (winkUtils.string?.removeHTMLTags) {
        cleanedText = winkUtils.string.removeHTMLTags(cleanedText);
      }
      if (winkUtils.string?.removeDiacritics) {
        cleanedText = winkUtils.string.removeDiacritics(cleanedText);
      }
    }

    // Process with Wink NLP
    const doc = nlp.readDoc(cleanedText);
    const its = nlp.its;

    // Extract sentences
    const sentences = doc.sentences().out();

    // Extract meaningful tokens (filtered)
    const tokens = doc.tokens()
      .filter((token: any) => {
        return !token.out(its.stopWordFlag) && 
               token.out(its.type) !== 'punctuation' &&
               token.out().length > 1;
      })
      .out();

    // Extract entity hints from Wink's basic entity recognition
    const entityHints: Array<{ value: string; type: string; start: number; end: number }> = [];
    
    // Get entities if available
    try {
      doc.entities().each((entity: any) => {
        const value = entity.out();
        const type = entity.out(its.type) || 'UNKNOWN';
        const detail = entity.out(its.detail);
        
        if (value && value.length > 1) {
          entityHints.push({
            value,
            type: type.toUpperCase(),
            start: detail?.start || 0,
            end: detail?.end || value.length
          });
        }
      });
    } catch (error) {
      console.warn('[NER] Wink entity extraction failed:', error);
    }

    // Calculate metadata
    const wordCount = tokens.length;
    const sentenceCount = sentences.length;
    
    // Check for proper nouns (capitalized words not at sentence start)
    const hasProperNouns = doc.tokens()
      .filter((token: any) => {
        const pos = token.out(its.pos);
        return pos === 'NNP' || pos === 'NNPS'; // Proper noun tags
      })
      .length > 0;

    // Calculate confidence based on text quality
    let confidence = 0.5; // Base confidence
    if (wordCount >= 5) confidence += 0.2;
    if (sentenceCount >= 2) confidence += 0.1;
    if (hasProperNouns) confidence += 0.2;
    confidence = Math.min(confidence, 1.0);

    return {
      cleanText: cleanedText.trim(),
      entityHints,
      sentences,
      tokens,
      metadata: {
        wordCount,
        sentenceCount,
        hasProperNouns,
        confidence
      }
    };

  } catch (error) {
    console.error('[NER] Wink text preparation failed:', error);
    return {
      cleanText: text.trim(),
      entityHints: [],
      sentences: [text.trim()],
      tokens: text.split(/\s+/).filter(Boolean),
      metadata: {
        wordCount: text.split(/\s+/).length,
        sentenceCount: 1,
        hasProperNouns: false,
        confidence: 0.3
      }
    };
  }
}

/**
 * Enhanced validation using Wink NLP linguistic analysis
 */
export async function validateTextForNER(text: string): Promise<{ 
  isValid: boolean; 
  reason?: string; 
  wordCount?: number;
  confidence?: number;
  suggestions?: string[];
}> {
  if (!text || typeof text !== 'string') {
    return { isValid: false, reason: 'No text provided' };
  }
  
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { isValid: false, reason: 'Text is empty' };
  }
  
  if (trimmed.length < 10) {
    return { isValid: false, reason: 'Text too short (minimum 10 characters)' };
  }

  // Use Wink NLP for better validation
  const preparation = await prepareTextForNER(trimmed);
  const { wordCount, confidence } = preparation.metadata;
  
  if (wordCount < 3) {
    return { 
      isValid: false, 
      reason: 'Not enough meaningful words (minimum 3 words)', 
      wordCount,
      confidence,
      suggestions: ['Add more descriptive text', 'Include proper nouns or entities']
    };
  }
  
  if (confidence < 0.4) {
    return { 
      isValid: false, 
      reason: 'Text quality too low for reliable NER', 
      wordCount,
      confidence,
      suggestions: [
        'Add more complete sentences',
        'Include proper nouns and entities',
        'Reduce special characters and formatting'
      ]
    };
  }
  
  return { 
    isValid: true, 
    wordCount,
    confidence,
    suggestions: confidence < 0.7 ? ['Consider adding more context for better results'] : undefined
  };
}

/**
 * Enhanced preprocessing using Wink NLP
 */
export async function preprocessTextForNER(text: string): Promise<string> {
  if (!text) return '';
  
  const preparation = await prepareTextForNER(text);
  return preparation.cleanText;
}
