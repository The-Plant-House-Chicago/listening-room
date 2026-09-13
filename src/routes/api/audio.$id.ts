import { createFileRoute } from "@tanstack/react-router";
import { getAudioMeta, readAudioSlice } from "@/lib/tracks.server";

/** Keep each response under typical serverless body limits (~4.5 MB). */
const MAX_SLICE = 1024 * 1024;

function parseRange(header: string | null, total: number): { start: number; end: number } {
  if (!header || !header.startsWith("bytes=")) {
    return { start: 0, end: Math.max(0, total - 1) };
  }
  const spec = header.slice(6).split(",")[0] ?? "";
  const [rawStart, rawEnd] = spec.split("-");
  let start = rawStart ? Number.parseInt(rawStart, 10) : 0;
  let end = rawEnd ? Number.parseInt(rawEnd, 10) : total - 1;
  if (!Number.isFinite(start) || start < 0) start = 0;
  if (!Number.isFinite(end) || end >= total) end = total - 1;
  if (start > end) start = 0;
  return { start, end };
}

export const Route = createFileRoute("/api/audio/$id")({
  server: {
    handlers: {
      HEAD: async ({ params }) => {
        const meta = await getAudioMeta(params.id);
        if (!meta) return new Response("Not found", { status: 404 });
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": meta.mime,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
            "Content-Length": String(meta.total),
          },
        });
      },
      GET: async ({ params, request }) => {
        const meta = await getAudioMeta(params.id);
        if (!meta) return new Response("Not found", { status: 404 });

        const rangeHeader = request.headers.get("range");
        let { start, end } = parseRange(rangeHeader, meta.total);
        if (end - start + 1 > MAX_SLICE) {
          end = start + MAX_SLICE - 1;
        }

        const slice = await readAudioSlice(params.id, start, end);
        if (!slice) return new Response("Not found", { status: 404 });

        const body = Buffer.from(slice.bytes);
        const actualEnd = start + body.byteLength - 1;
        const isPartial = start > 0 || actualEnd < slice.total - 1;

        if (isPartial) {
          return new Response(body, {
            status: 206,
            headers: {
              "Content-Type": slice.mime,
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=3600",
              "Content-Range": `bytes ${start}-${actualEnd}/${slice.total}`,
              "Content-Length": String(body.byteLength),
            },
          });
        }

        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": slice.mime,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
            "Content-Length": String(body.byteLength),
          },
        });
      },
    },
  },
});
