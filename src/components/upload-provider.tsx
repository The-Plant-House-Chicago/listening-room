import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  AUDIO_ACCEPT,
  AUDIO_CHUNK_SIZE,
  MAX_AUDIO_BYTES,
  inferMime,
  parseFilename,
} from "@/lib/track-types";
import { analyzeAudio, encodeChunk } from "@/lib/audio-utils";
import {
  createTrack,
  deleteTrack,
  finalizeTrack,
  uploadChunk,
} from "@/lib/tracks.functions";
import { hashSeed } from "@/lib/utils";
import { usePlayer } from "@/lib/player-store";
import type { Track } from "@/lib/track-types";
import {
  FILE_INPUT_ID,
  UploadContext,
  type PendingUpload,
} from "@/components/upload-context";

type UploadProviderProps = {
  children: ReactNode;
  onUploaded: (track: Track) => Promise<void> | void;
};

export function UploadProvider({ children, onUploaded }: UploadProviderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const playTrack = usePlayer((s) => s.playTrack);

  const setProgress = useCallback((key: string, patch: Partial<PendingUpload>) => {
    setPending((list) =>
      list.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`;
      const parsed = parseFilename(file.name);
      let createdId: string | null = null;
      setPending((list) => [
        ...list,
        { key, title: parsed.title, progress: 0.05, stage: "reading" },
      ]);

      try {
        if (file.size > MAX_AUDIO_BYTES) {
          throw new Error("Keep files under 20 MB");
        }
        const mime = inferMime(file);
        if (!mime.startsWith("audio/")) {
          throw new Error("Please choose an audio file (MP3, WAV, M4A)");
        }

        const buffer = await file.arrayBuffer();
        setProgress(key, { progress: 0.12, stage: "reading" });
        const analysis = await analyzeAudio(buffer);
        setProgress(key, { progress: 0.2, stage: "uploading" });

        const bytes = new Uint8Array(buffer);
        const chunkCount = Math.ceil(bytes.byteLength / AUDIO_CHUNK_SIZE);
        const track = await createTrack({
          data: {
            title: parsed.title,
            artist: parsed.artist,
            durationMs: analysis.durationMs,
            mimeType: mime,
            fileSize: bytes.byteLength,
            chunkCount,
            peaks: analysis.peaks,
            coverSeed: hashSeed(`${parsed.title}:${parsed.artist}:${file.size}`),
          },
        });
        createdId = track.id;

        let completed = 0;
        const workers = 3;
        let nextIndex = 0;

        async function worker() {
          while (nextIndex < chunkCount) {
            const idx = nextIndex;
            nextIndex += 1;
            const slice = bytes.subarray(
              idx * AUDIO_CHUNK_SIZE,
              (idx + 1) * AUDIO_CHUNK_SIZE,
            );
            const data = await encodeChunk(slice);
            await uploadChunk({ data: { trackId: track.id, idx, data } });
            completed += 1;
            setProgress(key, {
              progress: 0.2 + 0.75 * (completed / chunkCount),
              stage: "uploading",
            });
          }
        }

        await Promise.all(
          Array.from({ length: Math.min(workers, chunkCount) }, () => worker()),
        );

        const ready = await finalizeTrack({ data: { id: track.id } });
        setProgress(key, { progress: 1, stage: "uploading" });
        await onUploaded(ready);
        playTrack(ready);
        toast.success(`Added “${ready.title}”`);
      } catch (error) {
        if (createdId) {
          await deleteTrack({ data: { id: createdId } }).catch(() => undefined);
        }
        const message =
          error instanceof Error ? error.message : "Could not add that track";
        toast.error(message);
      } finally {
        setPending((list) => list.filter((item) => item.key !== key));
      }
    },
    [onUploaded, playTrack, setProgress],
  );

  const handleFiles = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list).filter((file) => {
        const mime = inferMime(file);
        return mime.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac|mp4)$/i.test(file.name);
      });
      if (files.length === 0) {
        toast.error("Choose an MP3 (or another audio file)");
        return;
      }
      void files.reduce(async (chain, file) => {
        await chain;
        await uploadFile(file);
      }, Promise.resolve());
    },
    [uploadFile],
  );

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const value = useMemo(
    () => ({ openPicker, pending, dragging }),
    [openPicker, pending, dragging],
  );

  return (
    <UploadContext.Provider value={value}>
      <input
        id={FILE_INPUT_ID}
        ref={inputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        multiple
        data-testid="track-file"
        className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-0"
        tabIndex={-1}
        aria-hidden="true"
        suppressHydrationWarning
        onChange={(event) => {
          if (event.target.files) handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <div
        className="min-h-dvh"
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          if (event.dataTransfer.files.length) handleFiles(event.dataTransfer.files);
        }}
      >
        {children}
        {dragging ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80">
            <div className="rounded-3xl bg-surface px-8 py-10 text-center shadow-[var(--shadow-border)]">
              <p className="font-serif text-2xl text-fg">Drop to add</p>
              <p className="mt-2 text-sm text-muted">MP3, WAV, or M4A from Suno</p>
            </div>
          </div>
        ) : null}
      </div>
    </UploadContext.Provider>
  );
}
