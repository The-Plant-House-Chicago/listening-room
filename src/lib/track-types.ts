export const AUDIO_CHUNK_SIZE = 192 * 1024;
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
export const PEAK_BARS = 128;

export type Track = {
  id: string;
  title: string;
  artist: string;
  durationMs: number;
  mimeType: string;
  fileSize: number;
  peaks: number[];
  coverSeed: number;
  createdAt: string;
};

/** Extensions first so iOS opens Files (Downloads), not the Music library. */
export const AUDIO_ACCEPT =
  ".mp3,.wav,.m4a,.aac,.ogg,.flac,audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/aac";

export function inferMime(file: File): string {
  const type = file.type.toLowerCase();
  if (type === "audio/mp3" || type === "audio/x-mpeg" || type === "audio/mpeg3") {
    return "audio/mpeg";
  }
  if (type.startsWith("audio/")) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".m4a") || name.endsWith(".mp4")) return "audio/mp4";
  if (name.endsWith(".aac")) return "audio/aac";
  if (name.endsWith(".ogg")) return "audio/ogg";
  if (name.endsWith(".flac")) return "audio/flac";
  if (name.endsWith(".webm")) return "audio/webm";
  return "audio/mpeg";
}

export function parseFilename(filename: string): { title: string; artist: string } {
  const base = filename.replace(/\.[^/.]+$/, "").trim();
  const stripped = base.replace(/\s*\(\d+\)\s*$/, "").trim();
  // Underscores → spaces first so "Song_Title_-_Artist" still splits on the dash.
  const cleaned = stripped.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  const dash = cleaned.split(/\s+[-–—]\s+/);
  if (dash.length >= 2) {
    const title = dash[0]?.trim() ?? cleaned;
    const artist = dash.slice(1).join(" - ").trim();
    return { title: title || cleaned, artist };
  }
  return { title: cleaned || "Untitled", artist: "" };
}

export function audioSrc(id: string): string {
  return `/api/audio/${id}`;
}
