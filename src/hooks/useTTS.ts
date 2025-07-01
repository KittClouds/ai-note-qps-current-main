
import { useState, useCallback, useRef, useEffect } from 'react';
import { ttsService, TTSOptions, TTSVoice } from '@/lib/tts/ttsService';

export interface UseTTSReturn {
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  stop: () => void;
  isLoading: boolean;
  isSpeaking: boolean;
  error: string | null;
  voices: TTSVoice[];
}

export function useTTS(): UseTTSReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speakingRef = useRef(false);

  const speak = useCallback(async (text: string, options?: TTSOptions) => {
    if (!text.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      await ttsService.speak(text, options);
      speakingRef.current = true;
      setIsSpeaking(true);
      
      // Poll for speaking status since we can't easily get callbacks
      const checkSpeaking = () => {
        if (speakingRef.current && !ttsService.isSpeaking()) {
          speakingRef.current = false;
          setIsSpeaking(false);
        } else if (speakingRef.current) {
          setTimeout(checkSpeaking, 100);
        }
      };
      checkSpeaking();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate speech';
      setError(errorMessage);
      console.error('TTS Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stop = useCallback(() => {
    ttsService.stop();
    speakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ttsService.stop();
    };
  }, []);

  return {
    speak,
    stop,
    isLoading,
    isSpeaking,
    error,
    voices: ttsService.getVoices()
  };
}
