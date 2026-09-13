import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { CoverDisc } from "@/components/cover-disc";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { usePlayer } from "@/lib/player-store";
import { formatTime } from "@/lib/utils";

export function PlayerBar() {
  const queue = usePlayer((s) => s.queue);
  const currentId = usePlayer((s) => s.currentId);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const toggle = usePlayer((s) => s.toggle);
  const seek = usePlayer((s) => s.seek);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);

  const track = queue.find((t) => t.id === currentId);
  if (!track) return null;

  const total = duration || track.durationMs / 1000;
  const progress = total > 0 ? currentTime / total : 0;

  return (
    <div className="px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-3xl rounded-3xl bg-surface p-3 shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-3">
          <CoverDisc
            seed={track.coverSeed}
            title={track.title}
            size={48}
            playing={isPlaying}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-fg">{track.title}</p>
            <p className="truncate text-sm text-muted">
              {track.artist || "Family mix"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              aria-label="Previous"
            >
              <SkipBack className="size-5" />
            </Button>
            <Button
              size="icon"
              onClick={toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              <span className="relative flex size-5 items-center justify-center">
                <Pause
                  className={`absolute size-5 transition-[opacity,transform,filter] duration-[var(--motion-fast)] ${
                    isPlaying
                      ? "scale-100 opacity-100 blur-0"
                      : "scale-[0.25] opacity-0 blur-[4px]"
                  }`}
                />
                <Play
                  className={`absolute size-5 translate-x-px transition-[opacity,transform,filter] duration-[var(--motion-fast)] ${
                    isPlaying
                      ? "scale-[0.25] opacity-0 blur-[4px]"
                      : "scale-100 opacity-100 blur-0"
                  }`}
                />
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              aria-label="Next"
            >
              <SkipForward className="size-5" />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 px-1">
          <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-subtle">
            {formatTime(currentTime)}
          </span>
          <Waveform
            peaks={track.peaks}
            progress={progress}
            onSeek={(ratio) => seek(ratio * total)}
            className="h-8"
          />
          <span className="w-10 shrink-0 font-mono text-xs tabular-nums text-subtle">
            {formatTime(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
