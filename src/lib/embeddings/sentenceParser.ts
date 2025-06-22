
/*
 * Browser‑friendly sentence splitter powered by Compromise
 * --------------------------------------------------------
 * Drop‑in replacement for the previous regex workaround.  
 * – Zero Node dependencies – works inside a Web Worker or main thread.
 * – Adds optional custom abbreviations at runtime.
 * – Exposes the same async API your chunker expects.
 */

import nlp from 'compromise/es';

export interface SentenceParseOptions {
  /**
   * List of abbreviations that should NOT end a sentence –
   * e.g. ['Dr', 'e.g', 'U.S']
   */
  abbreviations?: string[];
}

// Track abbreviations we have already injected – avoids duplicate plugins
const injectedAbbr: Set<string> = new Set();

/**
 * Inject user‑supplied abbreviations into Compromise's world model.
 * This runs once per new abbreviation and costs ~1 µs.
 */
function ensureAbbreviations(abbrs: string[]): void {
  const fresh = abbrs.filter(a => !injectedAbbr.has(a));
  if (fresh.length === 0) return;

  // Extend the global instance. Compromise merges into world.abbreviations.
  nlp.extend((_Doc, world) => {
    fresh.forEach(a => {
      world.model.one.abbreviations.push(a);
    });
  });
  fresh.forEach(a => injectedAbbr.add(a));
}

/**
 * Split text into sentences using Compromise.
 * Returns an array of trimmed sentence strings.
 */
export async function parseSentences(
  text: string,
  options: SentenceParseOptions = {}
): Promise<string[]> {
  if (!text || typeof text !== 'string') return [];

  // Optionally enrich the abbreviation list
  if (options.abbreviations && options.abbreviations.length) {
    ensureAbbreviations(options.abbreviations);
  }

  // Tokenise & extract sentences
  const sentences = nlp(text).sentences().out('array') as string[];
  return sentences.map(s => s.trim()).filter(Boolean);
}

/**
 * Simple fallback using basic punctuation – exported for completeness.
 */
export function simpleParseSentences(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return text.split(/[.!?]+/).map(t => t.trim()).filter(Boolean);
}
