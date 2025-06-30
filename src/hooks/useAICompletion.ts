
import { useState, useCallback } from 'react';
import { geminiLLMService } from '@/lib/generative-ai/geminiLLMService';

export interface AICompletionOptions {
  onComplete?: (completion: string) => void;
  onError?: (error: string) => void;
}

export const useAICompletion = (options: AICompletionOptions = {}) => {
  const [completion, setCompletion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateCompletion = useCallback(async (
    prompt: string, 
    option: string, 
    command?: string
  ) => {
    if (!geminiLLMService.isConfigured()) {
      const errorMsg = 'Gemini API key not configured. Please set it in API Settings.';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);
    setCompletion('');

    try {
      const response = await geminiLLMService.generateText(prompt, option, command);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedCompletion = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                accumulatedCompletion += text;
                setCompletion(accumulatedCompletion);
              }
            } catch (parseError) {
              // Skip malformed JSON
              continue;
            }
          }
        }
      }

      options.onComplete?.(accumulatedCompletion);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate AI completion';
      setError(errorMsg);
      options.onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setCompletion('');
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    completion,
    isLoading,
    error,
    generateCompletion,
    reset,
  };
};
