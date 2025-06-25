
// Enhanced utility functions to extract plain text from TipTap JSON documents

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
 * Validate if text is suitable for NER analysis
 */
export function validateTextForNER(text: string): { isValid: boolean; reason?: string; wordCount?: number } {
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
  
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  if (wordCount < 3) {
    return { isValid: false, reason: 'Not enough words (minimum 3 words)', wordCount };
  }
  
  // Check if text contains mostly special characters or numbers
  const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const alphaRatio = alphaCount / trimmed.length;
  
  if (alphaRatio < 0.5) {
    return { isValid: false, reason: 'Text contains too few alphabetic characters', wordCount };
  }
  
  return { isValid: true, wordCount };
}

/**
 * Preprocess text for better NER performance
 */
export function preprocessTextForNER(text: string): string {
  if (!text) return '';
  
  return text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove excessive punctuation
    .replace(/[.]{3,}/g, '...')
    .replace(/[!]{2,}/g, '!')
    .replace(/[?]{2,}/g, '?')
    // Clean up common formatting artifacts
    .replace(/\u00A0/g, ' ') // Non-breaking space
    .replace(/\u2009/g, ' ') // Thin space
    .replace(/\u200B/g, '') // Zero-width space
    .trim();
}
