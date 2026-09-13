import { getSql } from "@/lib/db";
import { AUDIO_CHUNK_SIZE, type Track } from "@/lib/track-types";

type TrackRow = {
  id: string;
  title: string;
  artist: string;
  duration_ms: number;
  mime_type: string;
  file_size: number;
  peaks: string;
  cover_seed: number;
  created_at: unknown;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  return new Date().toISOString();
}

function parsePeaks(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  } catch {
    return [];
  }
}

export function normalizeMime(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower === "audio/mp3" || lower === "audio/x-mpeg" || lower === "audio/mpeg3") {
    return "audio/mpeg";
  }
  if (lower === "audio/x-wav" || lower === "audio/wave" || lower === "audio/vnd.wave") {
    return "audio/wav";
  }
  return mime || "audio/mpeg";
}

export function mapTrack(row: TrackRow): Track {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    durationMs: Number(row.duration_ms) || 0,
    mimeType: normalizeMime(row.mime_type),
    fileSize: Number(row.file_size) || 0,
    peaks: parsePeaks(row.peaks),
    coverSeed: Number(row.cover_seed) || 0,
    createdAt: toIso(row.created_at),
  };
}

export async function listReadyTracks(): Promise<Track[]> {
  const sql = await getSql();
  const rows = await sql<TrackRow>`
    select id, title, artist, duration_ms, mime_type, file_size, peaks, cover_seed, created_at
    from tracks
    where ready = true
    order by created_at desc
  `;
  return rows.map(mapTrack);
}

export async function getAudioMeta(
  id: string,
): Promise<{ mime: string; total: number } | null> {
  const sql = await getSql();
  const meta = await sql<{
    mime_type: string;
    file_size: number;
    ready: boolean;
  }>`
    select mime_type, file_size, ready from tracks where id = ${id}
  `;
  const track = meta[0];
  if (!track || !track.ready) return null;
  const total = Number(track.file_size) || 0;
  if (total <= 0) return null;
  return { mime: normalizeMime(track.mime_type), total };
}

export async function readAudioSlice(
  id: string,
  start: number,
  end: number,
): Promise<{ bytes: Uint8Array; total: number; mime: string } | null> {
  const meta = await getAudioMeta(id);
  if (!meta) return null;

  const total = meta.total;
  const safeStart = Math.max(0, Math.min(start, total - 1));
  const safeEnd = Math.max(safeStart, Math.min(end, total - 1));
  const startChunk = Math.floor(safeStart / AUDIO_CHUNK_SIZE);
  const endChunk = Math.floor(safeEnd / AUDIO_CHUNK_SIZE);

  const sql = await getSql();
  const rows = await sql<{ idx: number; data: string }>`
    select idx, data
    from track_chunks
    where track_id = ${id} and idx >= ${startChunk} and idx <= ${endChunk}
    order by idx
  `;

  const parts: Buffer[] = [];
  for (const row of rows) {
    const bin = Buffer.from(row.data, "base64");
    const chunkStart = Number(row.idx) * AUDIO_CHUNK_SIZE;
    const sliceStart = Math.max(0, safeStart - chunkStart);
    const sliceEnd = Math.min(bin.length, safeEnd - chunkStart + 1);
    if (sliceEnd > sliceStart) {
      parts.push(bin.subarray(sliceStart, sliceEnd));
    }
  }

  const bytes = new Uint8Array(Buffer.concat(parts));
  return { bytes, total, mime: meta.mime };
}
