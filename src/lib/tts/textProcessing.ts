
import { extractTextFromNoteContent } from '@/lib/ner/textProcessing';

/**
 * Clean text for better speech synthesis
 */
export function cleanTextForTTS(text: string): string {
  return text
    // Remove markdown syntax
    .replace(/[#*_`~]/g, '')
    // Remove multiple spaces and newlines
    .replace(/\s+/g, ' ')
    // Remove special characters that don't contribute to speech
    .replace(/[^\w\s.,!?;:()-]/g, ' ')
    // Clean up spacing
    .trim();
}

/**
 * Extract and prepare text from note content for TTS
 */
export function prepareNoteForTTS(content: any): string {
  const rawText = extractTextFromNoteContent(content);
  return cleanTextForTTS(rawText);
}

/**
 * Split text into manageable chunks for TTS
 */
export function chunkTextForTTS(text: string, maxLength: number = 500): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    if (currentChunk.length + trimmedSentence.length <= maxLength) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
      }
      currentChunk = trimmedSentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }

  return chunks;
}
