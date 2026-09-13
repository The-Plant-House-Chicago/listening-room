import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { AUDIO_CHUNK_SIZE, MAX_AUDIO_BYTES, type Track } from "@/lib/track-types";
import { listReadyTracks, mapTrack, normalizeMime } from "@/lib/tracks.server";

const titleSchema = z.string().trim().min(1).max(120);
const artistSchema = z.string().trim().max(80);
const idSchema = z.string().min(8).max(80);

export const listTracks = createServerFn({ method: "GET" }).handler(async () => {
  return listReadyTracks();
});

export const createTrack = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: titleSchema,
      artist: artistSchema,
      durationMs: z.number().int().min(0).max(60 * 60 * 1000),
      mimeType: z.string().min(1).max(80),
      fileSize: z.number().int().min(1).max(MAX_AUDIO_BYTES),
      chunkCount: z.number().int().min(1).max(200),
      peaks: z.array(z.number()).max(200),
      coverSeed: z.number().int().min(0).max(2_147_483_647),
    }),
  )
  .handler(async ({ data }): Promise<Track> => {
    const expectedChunks = Math.ceil(data.fileSize / AUDIO_CHUNK_SIZE);
    if (data.chunkCount !== expectedChunks) {
      throw new Error("Upload size does not match chunk count");
    }
    if (!data.mimeType.startsWith("audio/")) {
      throw new Error("Only audio files can be added");
    }

    const sql = await getSql();
    const id = crypto.randomUUID();
    const peaks = JSON.stringify(data.peaks.map((n) => Math.max(0, Math.min(1, n))));
    const rows = await sql<{
      id: string;
      title: string;
      artist: string;
      duration_ms: number;
      mime_type: string;
      file_size: number;
      peaks: string;
      cover_seed: number;
      created_at: unknown;
    }>`
      insert into tracks (
        id, title, artist, duration_ms, mime_type, file_size, chunk_count, peaks, cover_seed, ready
      ) values (
        ${id},
        ${data.title},
        ${data.artist},
        ${data.durationMs},
        ${normalizeMime(data.mimeType)},
        ${data.fileSize},
        ${data.chunkCount},
        ${peaks},
        ${data.coverSeed % 2_147_483_647},
        false
      )
      returning id, title, artist, duration_ms, mime_type, file_size, peaks, cover_seed, created_at
    `;
    const row = rows[0];
    if (!row) throw new Error("Could not create track");
    return mapTrack(row);
  });

export const uploadChunk = createServerFn({ method: "POST" })
  .validator(
    z.object({
      trackId: idSchema,
      idx: z.number().int().min(0).max(200),
      data: z.string().min(1).max(400_000),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const meta = await sql<{ chunk_count: number; ready: boolean }>`
      select chunk_count, ready from tracks where id = ${data.trackId}
    `;
    const track = meta[0];
    if (!track) throw new Error("Track not found");
    if (track.ready) throw new Error("Track is already complete");
    if (data.idx >= track.chunk_count) throw new Error("Chunk out of range");

    await sql`
      insert into track_chunks (track_id, idx, data)
      values (${data.trackId}, ${data.idx}, ${data.data})
      on conflict (track_id, idx) do update set data = excluded.data
    `;
    return { ok: true as const };
  });

export const finalizeTrack = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }): Promise<Track> => {
    const sql = await getSql();
    const meta = await sql<{ chunk_count: number; ready: boolean }>`
      select chunk_count, ready from tracks where id = ${data.id}
    `;
    const track = meta[0];
    if (!track) throw new Error("Track not found");

    const counted = await sql<{ n: number }>`
      select count(*)::int as n from track_chunks where track_id = ${data.id}
    `;
    if ((counted[0]?.n ?? 0) !== track.chunk_count) {
      throw new Error("Upload is incomplete");
    }

    const rows = await sql<{
      id: string;
      title: string;
      artist: string;
      duration_ms: number;
      mime_type: string;
      file_size: number;
      peaks: string;
      cover_seed: number;
      created_at: unknown;
    }>`
      update tracks set ready = true where id = ${data.id}
      returning id, title, artist, duration_ms, mime_type, file_size, peaks, cover_seed, created_at
    `;
    const row = rows[0];
    if (!row) throw new Error("Could not finish upload");
    return mapTrack(row);
  });

export const updateTrack = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: idSchema,
      title: titleSchema,
      artist: artistSchema,
    }),
  )
  .handler(async ({ data }): Promise<Track> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      artist: string;
      duration_ms: number;
      mime_type: string;
      file_size: number;
      peaks: string;
      cover_seed: number;
      created_at: unknown;
    }>`
      update tracks
      set title = ${data.title}, artist = ${data.artist}
      where id = ${data.id} and ready = true
      returning id, title, artist, duration_ms, mime_type, file_size, peaks, cover_seed, created_at
    `;
    const row = rows[0];
    if (!row) throw new Error("Track not found");
    return mapTrack(row);
  });

export const deleteTrack = createServerFn({ method: "POST" })
  .validator(z.object({ id: idSchema }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      delete from tracks where id = ${data.id} returning id
    `;
    if (!rows[0]) throw new Error("Track not found");
    return { ok: true as const };
  });
