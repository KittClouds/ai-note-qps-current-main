
import { KokoroTTS } from 'kokoro-js';
import { WavBuilder } from './wavBuilder';

export type TTSVoice = 'af_bella' | 'af_sarah' | 'af_nicole' | 'af_sky' | 'am_adam' | 'am_michael';

export interface TTSOptions {
  voice?: TTSVoice;
  speed?: number;
}

export class TTSService {
  private tts: KokoroTTS | null = null;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isLoading = false;
  private isPlaying = false;

  /**
   * Initialize the TTS service
   */
  async initialize(): Promise<void> {
    if (this.tts || this.isLoading) return;

    this.isLoading = true;
    try {
      console.log('Loading TTS model...');
      this.tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
        dtype: 'q8'
      });
      console.log('TTS model loaded successfully');
    } catch (error) {
      console.error('Failed to load TTS model:', error);
      throw new Error('Failed to initialize TTS service');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Generate and play speech from text
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.tts) {
      await this.initialize();
    }

    if (!this.tts) {
      throw new Error('TTS service not initialized');
    }

    try {
      // Stop any currently playing audio
      this.stop();

      console.log('Generating speech for:', text.substring(0, 50) + '...');
      
      // Generate audio using kokoro-js
      const audioData = await this.tts.generate(text, {
        voice: options.voice || 'af_bella'
      });

      // Convert to WAV format
      const wavBlob = WavBuilder.createWavFromPCM(audioData.audio, audioData.sampling_rate);
      
      // Play the audio
      await this.playAudioBlob(wavBlob);
      
    } catch (error) {
      console.error('Failed to generate or play speech:', error);
      throw new Error('Failed to generate speech');
    }
  }

  /**
   * Play audio blob using Web Audio API with HTML5 Audio fallback
   */
  private async playAudioBlob(blob: Blob): Promise<void> {
    try {
      // Try Web Audio API first
      await this.playWithWebAudio(blob);
    } catch (error) {
      console.warn('Web Audio API failed, falling back to HTML5 Audio:', error);
      // Fallback to HTML5 Audio
      await this.playWithHTMLAudio(blob);
    }
  }

  /**
   * Play audio using Web Audio API
   */
  private async playWithWebAudio(blob: Blob): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    this.currentSource.connect(this.audioContext.destination);
    
    this.isPlaying = true;
    
    return new Promise((resolve, reject) => {
      if (!this.currentSource) {
        reject(new Error('Audio source not created'));
        return;
      }

      this.currentSource.onended = () => {
        this.isPlaying = false;
        resolve();
      };

      try {
        this.currentSource.start();
      } catch (error) {
        this.isPlaying = false;
        reject(error);
      }
    });
  }

  /**
   * Play audio using HTML5 Audio (fallback)
   */
  private async playWithHTMLAudio(blob: Blob): Promise<void> {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    this.isPlaying = true;

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        this.isPlaying = false;
        URL.revokeObjectURL(url);
        resolve();
      };

      audio.onerror = () => {
        this.isPlaying = false;
        URL.revokeObjectURL(url);
        reject(new Error('HTML5 Audio playback failed'));
      };

      audio.play().catch((error) => {
        this.isPlaying = false;
        URL.revokeObjectURL(url);
        reject(error);
      });
    });
  }

  /**
   * Stop current playback
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Ignore errors when stopping
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  /**
   * Get available voices
   */
  getVoices(): TTSVoice[] {
    return ['af_bella', 'af_sarah', 'af_nicole', 'af_sky', 'am_adam', 'am_michael'];
  }

  /**
   * Check if TTS is currently speaking
   */
  isSpeaking(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if TTS is loading
   */
  isInitializing(): boolean {
    return this.isLoading;
  }
}

// Export singleton instance
export const ttsService = new TTSService();
