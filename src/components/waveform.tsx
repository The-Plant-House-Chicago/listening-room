import { useMemo, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

type WaveformProps = {
  peaks: number[];
  progress: number;
  onSeek?: (ratio: number) => void;
  className?: string;
};

export function Waveform({ peaks, progress, onSeek, className }: WaveformProps) {
  const bars = useMemo(() => {
    if (peaks.length === 0) return Array.from({ length: 64 }, () => 0.25);
    return peaks.map((p) => Math.max(0.08, Math.min(1, p)));
  }, [peaks]);

  function ratioFromEvent(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!onSeek) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 0.05 : -0.05;
      onSeek(Math.max(0, Math.min(1, progress + delta)));
    }
  }

  return (
    <div
      className={cn(
        "flex h-10 w-full select-none items-center gap-px touch-none",
        onSeek && "cursor-pointer",
        className,
      )}
      onPointerDown={
        onSeek
          ? (event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              onSeek(ratioFromEvent(event));
            }
          : undefined
      }
      onPointerMove={
        onSeek
          ? (event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                onSeek(ratioFromEvent(event));
              }
            }
          : undefined
      }
      onKeyDown={onSeek ? handleKey : undefined}
      role={onSeek ? "slider" : undefined}
      tabIndex={onSeek ? 0 : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(progress * 100) : undefined}
      aria-label={onSeek ? "Seek" : undefined}
    >
      {bars.map((height, i) => {
        const ratio = (i + 0.5) / bars.length;
        const played = ratio <= progress;
        return (
          <span
            key={i}
            className={cn(
              "inline-block min-w-px flex-1 rounded-full",
              played ? "bg-fg" : "bg-fg/25",
            )}
            style={{ height: `${Math.round(height * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
