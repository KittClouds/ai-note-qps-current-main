
/**
 * Browser-compatible sentence parsing utility
 * Replaces the sentence-parse package that has Node.js dependencies
 */

export interface SentenceParseOptions {
  abbreviations?: string[];
  customRegex?: RegExp;
}

// Common abbreviations that shouldn't trigger sentence breaks
const DEFAULT_ABBREVIATIONS = [
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr',
  'vs', 'etc', 'i.e', 'e.g', 'cf', 'al', 'Inc',
  'Ltd', 'Co', 'Corp', 'LLC', 'St', 'Ave', 'Blvd',
  'Rd', 'Ct', 'Pl', 'Sq', 'ft', 'lb', 'oz', 'kg',
  'cm', 'mm', 'km', 'hr', 'min', 'sec', 'Jan',
  'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec', 'Mon', 'Tue', 'Wed',
  'Thu', 'Fri', 'Sat', 'Sun', 'U.S', 'U.K'
];

/**
 * Split text into sentences using a regex-based approach
 * This is a simplified but effective sentence splitter for browser use
 */
export async function parseSentences(
  text: string, 
  options: SentenceParseOptions = {}
): Promise<string[]> {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const abbreviations = [...DEFAULT_ABBREVIATIONS, ...(options.abbreviations || [])];
  
  // Clean up the text
  let cleanText = text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Handle abbreviations by temporarily replacing them
  const abbreviationMap = new Map<string, string>();
  abbreviations.forEach((abbr, index) => {
    const placeholder = `__ABBR_${index}__`;
    const regex = new RegExp(`\\b${abbr.replace(/\./g, '\\.')}\\b`, 'gi');
    cleanText = cleanText.replace(regex, (match) => {
      abbreviationMap.set(placeholder, match);
      return placeholder;
    });
  });

  // Split on sentence-ending punctuation followed by whitespace and capital letter
  // or end of string
  const sentences = cleanText
    .split(/([.!?]+)\s+(?=[A-Z])|([.!?]+)$/)
    .filter(part => part && part.trim().length > 0)
    .reduce((acc: string[], current, index, array) => {
      // Combine sentence parts that were split by the regex
      if (index % 2 === 0) {
        const nextPart = array[index + 1];
        const sentence = nextPart ? current + nextPart : current;
        if (sentence.trim()) {
          acc.push(sentence.trim());
        }
      }
      return acc;
    }, []);

  // Restore abbreviations
  const finalSentences = sentences.map(sentence => {
    let restored = sentence;
    abbreviationMap.forEach((original, placeholder) => {
      restored = restored.replace(new RegExp(placeholder, 'g'), original);
    });
    return restored;
  }).filter(sentence => sentence.length > 0);

  // If no sentences were found, return the original text as a single sentence
  if (finalSentences.length === 0 && cleanText.trim()) {
    return [cleanText.trim()];
  }

  return finalSentences;
}

/**
 * Alternative sentence splitting method using a simpler approach
 * Useful as a fallback or for simpler text processing needs
 */
export function simpleParseSentences(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  return text
    .split(/[.!?]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);
}
