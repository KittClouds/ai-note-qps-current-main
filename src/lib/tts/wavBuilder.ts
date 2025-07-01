
/**
 * Utility to convert raw PCM audio data to WAV format
 */
export class WavBuilder {
  /**
   * Convert Float32Array PCM data to WAV format
   */
  static createWavFromPCM(samples: Float32Array, sampleRate: number = 24000): Blob {
    // Convert float32 samples to int16
    const int16Samples = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit signed integer
      const sample = Math.max(-1, Math.min(1, samples[i]));
      int16Samples[i] = sample * 0x7FFF;
    }

    // Calculate sizes
    const dataLength = int16Samples.length * 2; // 2 bytes per sample
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    // Create WAV file buffer
    const buffer = new ArrayBuffer(totalLength);
    const view = new DataView(buffer);

    // WAV file header
    let offset = 0;

    // RIFF header
    this.writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, totalLength - 8, true); offset += 4; // File size - 8
    this.writeString(view, offset, 'WAVE'); offset += 4;

    // fmt chunk
    this.writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4; // fmt chunk size
    view.setUint16(offset, 1, true); offset += 2; // PCM format
    view.setUint16(offset, 1, true); offset += 2; // Mono
    view.setUint32(offset, sampleRate, true); offset += 4; // Sample rate
    view.setUint32(offset, sampleRate * 2, true); offset += 4; // Byte rate
    view.setUint16(offset, 2, true); offset += 2; // Block align
    view.setUint16(offset, 16, true); offset += 2; // Bits per sample

    // data chunk
    this.writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, dataLength, true); offset += 4;

    // Write PCM data
    for (let i = 0; i < int16Samples.length; i++) {
      view.setInt16(offset, int16Samples[i], true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private static writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
