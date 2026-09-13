import { MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CoverDisc } from "@/components/cover-disc";
import { Waveform } from "@/components/waveform";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteTrack, updateTrack } from "@/lib/tracks.functions";
import { usePlayer } from "@/lib/player-store";
import type { Track } from "@/lib/track-types";
import { formatTime } from "@/lib/utils";

type TrackRowProps = {
  track: Track;
  onChanged: (track: Track) => void;
  onRemoved: (id: string) => void;
};

export function TrackRow({ track, onChanged, onRemoved }: TrackRowProps) {
  const currentId = usePlayer((s) => s.currentId);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const playTrack = usePlayer((s) => s.playTrack);
  const toggle = usePlayer((s) => s.toggle);
  const seek = usePlayer((s) => s.seek);

  const active = currentId === track.id;
  const playing = active && isPlaying;
  const total = active && duration ? duration : track.durationMs / 1000;
  const progress = active && total > 0 ? currentTime / total : 0;

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [busy, setBusy] = useState(false);

  function handlePlay() {
    if (active) toggle();
    else playTrack(track);
  }

  function handleSeek(ratio: number) {
    const seconds = ratio * total;
    if (active) seek(seconds);
    else playTrack(track, seconds);
  }

  async function saveRename(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const next = await updateTrack({
        data: { id: track.id, title: title.trim() || track.title, artist: artist.trim() },
      });
      onChanged(next);
      setRenameOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(event: { preventDefault: () => void }) {
    event.preventDefault();
    setBusy(true);
    try {
      await deleteTrack({ data: { id: track.id } });
      onRemoved(track.id);
      setDeleteOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove track");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-3xl bg-surface p-3 shadow-[var(--shadow-border)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlay}
          className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          <CoverDisc
            seed={track.coverSeed}
            title={track.title}
            size={56}
            playing={playing}
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-bg/50 sm:bg-bg/40 sm:opacity-0 sm:transition-opacity sm:duration-[var(--motion-quick)] sm:hover:opacity-100">
            {playing ? (
              <Pause className="size-5 text-fg" />
            ) : (
              <Play className="size-5 translate-x-px text-fg" />
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={handlePlay}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate font-medium text-fg">{track.title}</p>
          <p className="truncate text-sm text-muted">
            {track.artist || "Family mix"}
            <span className="text-subtle">
              {" · "}
              {formatTime(track.durationMs / 1000)}
            </span>
          </p>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Track actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                setTitle(track.title);
                setArtist(track.artist);
                setRenameOpen(true);
              }}
            >
              <Pencil className="size-4 text-muted" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-danger"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Waveform
        peaks={track.peaks}
        progress={active ? progress : 0}
        onSeek={handleSeek}
        className="mt-3 h-9 px-1"
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename track</DialogTitle>
            <DialogDescription>Titles come from the file name. Change them anytime.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveRename} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`title-${track.id}`}>Title</Label>
              <Input
                id={`title-${track.id}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`artist-${track.id}`}>Artist</Label>
              <Input
                id={`artist-${track.id}`}
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
                maxLength={80}
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={busy}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this track?</AlertDialogTitle>
            <AlertDialogDescription>
              “{track.title}” will leave the mix for everyone with the link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={busy}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
