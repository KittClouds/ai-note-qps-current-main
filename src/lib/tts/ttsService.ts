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
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private voices: TTSVoice[] = [];
  private initialized = false;
  private isCurrentlyPlaying = false;
  private isPaused = false;

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
      
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TTS:', error);
      throw new Error('Failed to initialize text-to-speech engine');
    }
  }

  async generateSpeech(text: string, voice: string = 'af_bella'): Promise<AudioBuffer> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const audio = await this.tts.generate(text, { voice });
      
      // Get the raw audio data
      let audioData: Float32Array;
      if (audio.data instanceof ArrayBuffer) {
        audioData = new Float32Array(audio.data);
      } else if (audio.data instanceof Float32Array) {
        audioData = audio.data;
      } else if (audio.data instanceof Uint8Array) {
        // Convert Uint8Array to Float32Array
        audioData = new Float32Array(audio.data.length);
        for (let i = 0; i < audio.data.length; i++) {
          audioData[i] = (audio.data[i] - 128) / 128.0; // Convert from 0-255 to -1 to 1
        }
      } else {
        throw new Error('Unsupported audio data format');
      }

      // Create AudioBuffer from the raw audio data
      const audioBuffer = this.audioContext!.createBuffer(1, audioData.length, audio.sampleRate || 24000);
      audioBuffer.copyToChannel(audioData, 0);
      
      return audioBuffer;
    } catch (error) {
      console.error('Failed to generate speech:', error);
      throw new Error('Failed to generate speech');
    }
  }

  async playText(text: string, voice: string = 'af_bella'): Promise<void> {
    try {
      this.stop(); // Stop any current playback
      
      const audioBuffer = await this.generateSpeech(text, voice);
      
      if (!this.audioContext) {
        throw new Error('Audio context not initialized');
      }

      // Resume audio context if it's suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);
      
      this.currentSource.onended = () => {
        this.isCurrentlyPlaying = false;
        this.isPaused = false;
        this.currentSource = null;
      };
      
      this.currentSource.start();
      this.isCurrentlyPlaying = true;
      this.isPaused = false;
    } catch (error) {
      console.error('Failed to play text:', error);
      throw error;
    }
  }

  pause(): void {
    // Web Audio API doesn't support pause/resume directly
    // We'll need to stop and remember position for resume
    if (this.currentSource && this.isCurrentlyPlaying) {
      this.currentSource.stop();
      this.isCurrentlyPlaying = false;
      this.isPaused = true;
    }
  }

  resume(): void {
    // Since Web Audio API doesn't support resume, 
    // this would require re-implementing with more complex state management
    // For now, we'll just indicate it's not paused
    this.isPaused = false;
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.isCurrentlyPlaying = false;
    this.isPaused = false;
  }

  getVoices(): TTSVoice[] {
    return this.voices;
  }

  isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }

  isPaused(): boolean {
    return this.isPaused;
  }
}

export const ttsService = new TTSService();
