/**
 * MediaRecorder gives us webm/opus, but the transcriber wants WAV. Decode
 * whatever the browser recorded, downmix to mono, resample, and re-encode.
 */
const TARGET_SAMPLE_RATE = 16_000;

function downmixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);

  const mixed = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) mixed[i] += data[i];
  }
  for (let i = 0; i < mixed.length; i++) mixed[i] /= buffer.numberOfChannels;
  return mixed;
}

/** Linear interpolation is plenty for speech headed to an ASR model. */
function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;

  const ratio = from / to;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i++) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const weight = position - left;
    output[i] = input[left] * (1 - weight) + input[right] * weight;
  }
  return output;
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return buffer;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // Chunked so a long answer can't blow the argument limit.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Recorded answer -> base64 16kHz mono WAV. */
export async function blobToWavBase64(blob: Blob): Promise<string> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const mono = downmixToMono(decoded);
    const resampled = resample(mono, decoded.sampleRate, TARGET_SAMPLE_RATE);
    return toBase64(encodeWav(resampled, TARGET_SAMPLE_RATE));
  } finally {
    await context.close();
  }
}

/**
 * Base64 audio from the server -> a URL an <audio> element can play. The type
 * has to come from the server: Gemini TTS returns WAV, OpenRouter returns MP3.
 */
export function base64AudioToUrl(base64: string, mimeType?: string | null): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(
    new Blob([bytes], { type: mimeType || "audio/wav" }),
  );
}
