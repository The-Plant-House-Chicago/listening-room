import { PEAK_BARS } from "./track-types";

export async function encodeChunk(bytes: Uint8Array): Promise<string> {
  let binary = "";
  const step = 8192;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    binary += String.fromCharCode(...Array.from(slice));
  }
  return btoa(binary);
}

export type AudioAnalysis = {
  durationMs: number;
  peaks: number[];
};

function syntheticPeaks(seed: number, bars: number): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < bars; i += 1) {
    const wave = 0.35 + 0.45 * Math.abs(Math.sin(i / 6 + (seed % 7)));
    const pulse = 0.2 * Math.abs(Math.sin(i / 2.4));
    peaks.push(Math.min(1, wave + pulse));
  }
  return peaks;
}

async function durationFromObjectUrl(buffer: ArrayBuffer): Promise<number> {
  const blob = new Blob([buffer]);
  const url = URL.createObjectURL(blob);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => reject(new Error("Could not read audio duration"));
      audio.src = url;
    });
    return Number.isFinite(duration) ? duration : 0;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function analyzeAudio(buffer: ArrayBuffer): Promise<AudioAnalysis> {
  const fallback = async (): Promise<AudioAnalysis> => {
    const duration = await durationFromObjectUrl(buffer).catch(() => 0);
    return {
      durationMs: Math.round(duration * 1000),
      peaks: syntheticPeaks(buffer.byteLength, PEAK_BARS),
    };
  };

  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return fallback();
  }

  try {
    const ctx = new AudioContext();
    await ctx.resume().catch(() => undefined);
    const decoded = await ctx.decodeAudioData(buffer.slice(0));
    const channel = decoded.getChannelData(0);
    const bars = PEAK_BARS;
    const block = Math.max(1, Math.floor(channel.length / bars));
    const peaks: number[] = [];
    for (let i = 0; i < bars; i += 1) {
      const start = i * block;
      let max = 0;
      for (let j = 0; j < block; j += 32) {
        const v = Math.abs(channel[start + j] ?? 0);
        if (v > max) max = v;
      }
      peaks.push(max);
    }
    const peakMax = peaks.reduce((a, b) => (a > b ? a : b), 0.0001);
    const normalized = peaks.map((p) => Math.min(1, p / peakMax));
    const durationMs = Math.round(decoded.duration * 1000);
    await ctx.close().catch(() => undefined);
    return { durationMs, peaks: normalized };
  } catch {
    return fallback();
  }
}
