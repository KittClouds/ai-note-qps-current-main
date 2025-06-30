
import { useState, useCallback, useEffect } from 'react';
import { ttsService, TTSState } from '@/lib/tts/ttsService';

const DEFAULT_VOICE = 'af_bella';

export const useTTS = () => {
  const [state, setState] = useState<TTSState>({
    isInitialized: false,
    isLoading: false,
    isPlaying: false,
    isPaused: false,
    currentVoice: localStorage.getItem('tts-voice') || DEFAULT_VOICE,
    error: null,
  });

  const updateState = useCallback((updates: Partial<TTSState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const initialize = useCallback(async () => {
    if (state.isInitialized) return;

    updateState({ isLoading: true, error: null });
    try {
      await ttsService.initialize();
      updateState({ isInitialized: true, isLoading: false });
    } catch (error) {
      updateState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize TTS' 
      });
    }
  }, [state.isInitialized, updateState]);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      updateState({ isLoading: true, error: null });
      
      if (!state.isInitialized) {
        await initialize();
      }

      await ttsService.playText(text, state.currentVoice);
      updateState({ isPlaying: true, isPaused: false, isLoading: false });
    } catch (error) {
      updateState({ 
        isLoading: false, 
        isPlaying: false,
        error: error instanceof Error ? error.message : 'Failed to play text' 
      });
    }
  }, [state.isInitialized, state.currentVoice, initialize, updateState]);

  const pause = useCallback(() => {
    ttsService.pause();
    updateState({ isPaused: true, isPlaying: false });
  }, [updateState]);

  const resume = useCallback(() => {
    ttsService.resume();
    updateState({ isPaused: false, isPlaying: true });
  }, [updateState]);

  const stop = useCallback(() => {
    ttsService.stop();
    updateState({ isPlaying: false, isPaused: false });
  }, [updateState]);

  const setVoice = useCallback((voice: string) => {
    localStorage.setItem('tts-voice', voice);
    updateState({ currentVoice: voice });
  }, [updateState]);

  // Check playback status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const isCurrentlyPlaying = ttsService.isPlaying();
      const isCurrentlyPaused = ttsService.isPaused();
      
      if (state.isPlaying !== isCurrentlyPlaying || state.isPaused !== isCurrentlyPaused) {
        updateState({ 
          isPlaying: isCurrentlyPlaying, 
          isPaused: isCurrentlyPaused 
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [state.isPlaying, state.isPaused, updateState]);

  return {
    ...state,
    speak,
    pause,
    resume,
    stop,
    setVoice,
    initialize,
    voices: ttsService.getVoices(),
  };
};
