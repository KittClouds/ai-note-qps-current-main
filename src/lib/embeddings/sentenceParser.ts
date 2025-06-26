
/*
 * Browser‑friendly sentence splitter powered by Wink NLP
 * --------------------------------------------------------
 * Drop‑in replacement for the previous Compromise implementation.  
 * – Zero additional dependencies – reuses existing Wink NLP infrastructure.
 * – Adds optional custom abbreviations at runtime.
 * – Exposes the same async API your chunker expects.
 */

// @ts-ignore - We'll handle the import dynamically
let winkNLP: any = null;
let model: any = null;

// Dynamic import to handle potential loading issues
async function loadWinkNLP() {
  try {
    const winkModule = await import('wink-nlp');
    const modelModule = await import('wink-eng-lite-web-model');
    winkNLP = winkModule.default || winkModule;
    model = modelModule.default || modelModule;
    return true;
  } catch (error) {
    console.warn('Failed to load wink-nlp modules:', error);
    return false;
  }
}

export interface SentenceParseOptions {
  /**
   * List of abbreviations that should NOT end a sentence –
   * e.g. ['Dr', 'e.g', 'U.S']
   */
  abbreviations?: string[];
}

/**
 * Split text into sentences using Wink NLP.
 * Returns an array of trimmed sentence strings.
 */
export async function parseSentences(
  text: string,
  options: SentenceParseOptions = {}
): Promise<string[]> {
  if (!text || typeof text !== 'string') return [];

  // Ensure Wink NLP is loaded
  const loaded = await loadWinkNLP();
  if (!loaded || !winkNLP || !model) {
    console.warn('Wink NLP not available, falling back to simple parsing');
    return simpleParseSentences(text);
  }

  try {
    // Pre-process abbreviations by masking periods
    let processedText = text;
    if (options.abbreviations && options.abbreviations.length) {
      for (const abbr of options.abbreviations) {
        // Replace periods in abbreviations with placeholder character
        const safe = abbr.replace(/\./g, '¶');
        const regex = new RegExp(`\\b${abbr.replace(/\./g, '\\.')}\\.`, 'g');
        processedText = processedText.replace(regex, `${safe}.`);
      }
    }

    // Initialize Wink NLP with tokenization and sentence boundary detection
    const nlp = winkNLP(model, ['tokenization', 'sbd']);
    const doc = nlp.readDoc(processedText);
    
    // Extract sentences
    const sentences = doc.sentences().out();
    
    // Post-process: restore periods and clean up
    return sentences
      .map(s => s.replace(/¶/g, '.').trim())
      .filter(Boolean);
      
  } catch (error) {
    console.warn('Wink NLP sentence parsing failed, falling back to simple parsing:', error);
    return simpleParseSentences(text);
  }
}

/**
 * Simple fallback using basic punctuation – exported for completeness.
 */
export function simpleParseSentences(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return text.split(/[.!?]+/).map(t => t.trim()).filter(Boolean);
}
