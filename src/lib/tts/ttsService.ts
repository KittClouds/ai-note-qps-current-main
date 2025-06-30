
import { KokoroTTS } from 'kokoro-js';

export interface TTSVoice {
  id: string;
  name: string;
  gender: 'female' | 'male';
  category: string;
}

export interface TTSState {
  isInitialized: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentVoice: string;
  error: string | null;
}

class TTSService {
  private tts: any = null;
  private currentAudio: HTMLAudioElement | null = null;
  private voices: TTSVoice[] = [];
  private initialized = false;

  constructor() {
    this.setupVoices();
  }

  private setupVoices() {
    this.voices = [
      // Female voices
      { id: 'af_bella', name: 'Bella', gender: 'female', category: 'Standard' },
      { id: 'af_jessica', name: 'Jessica', gender: 'female', category: 'Standard' },
      { id: 'af_nicole', name: 'Nicole', gender: 'female', category: 'Standard' },
      { id: 'af_sarah', name: 'Sarah', gender: 'female', category: 'Standard' },
      { id: 'af_sky', name: 'Sky', gender: 'female', category: 'Standard' },
      { id: 'af_nova', name: 'Nova', gender: 'female', category: 'Premium' },
      { id: 'af_alloy', name: 'Alloy', gender: 'female', category: 'Premium' },
      { id: 'af_aoede', name: 'Aoede', gender: 'female', category: 'Premium' },
      { id: 'af_heart', name: 'Heart', gender: 'female', category: 'Premium' },
      { id: 'af_kore', name: 'Kore', gender: 'female', category: 'Premium' },
      { id: 'af_river', name: 'River', gender: 'female', category: 'Premium' },
      { id: 'bf_alice', name: 'Alice', gender: 'female', category: 'British' },
      { id: 'bf_emma', name: 'Emma', gender: 'female', category: 'British' },
      { id: 'bf_isabella', name: 'Isabella', gender: 'female', category: 'British' },
      { id: 'bf_lily', name: 'Lily', gender: 'female', category: 'British' },
      
      // Male voices
      { id: 'am_adam', name: 'Adam', gender: 'male', category: 'Standard' },
      { id: 'am_echo', name: 'Echo', gender: 'male', category: 'Standard' },
      { id: 'am_eric', name: 'Eric', gender: 'male', category: 'Standard' },
      { id: 'am_liam', name: 'Liam', gender: 'male', category: 'Standard' },
      { id: 'am_michael', name: 'Michael', gender: 'male', category: 'Standard' },
      { id: 'am_onyx', name: 'Onyx', gender: 'male', category: 'Premium' },
      { id: 'am_fenrir', name: 'Fenrir', gender: 'male', category: 'Premium' },
      { id: 'am_puck', name: 'Puck', gender: 'male', category: 'Premium' },
      { id: 'am_santa', name: 'Santa', gender: 'male', category: 'Special' },
      { id: 'bm_daniel', name: 'Daniel', gender: 'male', category: 'British' },
      { id: 'bm_fable', name: 'Fable', gender: 'male', category: 'British' },
      { id: 'bm_george', name: 'George', gender: 'male', category: 'British' },
      { id: 'bm_lewis', name: 'Lewis', gender: 'male', category: 'British' },
    ];
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const model_id = "onnx-community/Kokoro-82M-ONNX";
      this.tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: "q8",
      });
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TTS:', error);
      throw new Error('Failed to initialize text-to-speech engine');
    }
  }

  async generateSpeech(text: string, voice: string = 'af_bella'): Promise<Blob> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const audio = await this.tts.generate(text, { voice });
      return audio.data; // Return the audio blob
    } catch (error) {
      console.error('Failed to generate speech:', error);
      throw new Error('Failed to generate speech');
    }
  }

  async playText(text: string, voice: string = 'af_bella'): Promise<void> {
    try {
      this.stop(); // Stop any current playback
      
      const audioBlob = await this.generateSpeech(text, voice);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.onended = () => {
        this.cleanup();
      };
      
      await this.currentAudio.play();
    } catch (error) {
      console.error('Failed to play text:', error);
      throw error;
    }
  }

  pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }
  }

  resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play();
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.cleanup();
    }
  }

  private cleanup(): void {
    if (this.currentAudio) {
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }
  }

  getVoices(): TTSVoice[] {
    return this.voices;
  }

  isPlaying(): boolean {
    return this.currentAudio ? !this.currentAudio.paused : false;
  }

  isPaused(): boolean {
    return this.currentAudio ? this.currentAudio.paused : false;
  }
}

export const ttsService = new TTSService();
