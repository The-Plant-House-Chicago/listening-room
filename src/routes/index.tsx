import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { EmptyState } from "@/components/empty-state";
import { PendingRow } from "@/components/pending-row";
import { PlayerBar } from "@/components/player-bar";
import { SiteHeader } from "@/components/site-header";
import { TrackRow } from "@/components/track-row";
import { UploadProvider } from "@/components/upload-provider";
import { useUpload } from "@/components/upload-context";
import { usePlayer } from "@/lib/player-store";
import { listTracks } from "@/lib/tracks.functions";
import type { Track } from "@/lib/track-types";

export const Route = createFileRoute("/")({
  loader: () => listTracks(),
  component: Home,
});

function Home() {
  const tracks = Route.useLoaderData();
  const router = useRouter();

  return (
    <UploadProvider
      onUploaded={async () => {
        await router.invalidate();
      }}
    >
      <HomeBody tracks={tracks} />
    </UploadProvider>
  );
}

function HomeBody({ tracks }: { tracks: Track[] }) {
  const router = useRouter();
  const { pending } = useUpload();
  const setQueue = usePlayer((s) => s.setQueue);
  const stopIfCurrent = usePlayer((s) => s.stopIfCurrent);
  const toggle = usePlayer((s) => s.toggle);

  useEffect(() => {
    setQueue(tracks);
  }, [tracks, setQueue]);

  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") void router.invalidate();
    }
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [router]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "BUTTON" ||
        tag === "SELECT" ||
        tag === "A" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (target?.closest("[role='dialog'], [role='menu'], [role='menuitem'], [role='slider']")) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const empty = tracks.length === 0 && pending.length === 0;

  return (
    <div className="flex h-dvh flex-col bg-bg">
      {empty ? null : <SiteHeader trackCount={tracks.length} compact />}
      {empty ? (
        <EmptyState />
      ) : (
        <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-4 py-5">
          {pending.map((item) => (
            <PendingRow key={item.key} item={item} />
          ))}
          {tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              onChanged={() => {
                void router.invalidate();
              }}
              onRemoved={(id) => {
                stopIfCurrent(id);
                void router.invalidate();
              }}
            />
          ))}
        </main>
      )}
      <PlayerBar />
    </div>
  );
}
