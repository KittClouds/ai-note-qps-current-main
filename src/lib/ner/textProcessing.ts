
// Utility functions to extract plain text from TipTap JSON documents

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
 * Extract plain text from TipTap JSON document
 */
export function extractPlainTextFromTipTap(doc: any): string {
  if (!doc || !doc.content) return '';
  
  let fullText = '';
  
  for (const node of doc.content) {
    fullText += extractTextFromTipTapNode(node);
    
    // Add spaces for better readability between blocks
    if (node.type === 'paragraph' || node.type === 'heading') {
      fullText += ' ';
    }
  }
  
  return fullText.trim();
}

/**
 * Extract text from note content (handles both string and object formats)
 */
export function extractTextFromNoteContent(content: any): string {
  if (!content) return '';
  
  if (typeof content === 'string') {
    try {
      // Try to parse as JSON first
      const jsonContent = JSON.parse(content);
      return extractPlainTextFromTipTap(jsonContent);
    } catch {
      // If not JSON, return as plain text
      return content;
    }
  } else if (content && typeof content === 'object') {
    // If content is already an object (TipTap JSON)
    return extractPlainTextFromTipTap(content);
  }
  
  return '';
}
