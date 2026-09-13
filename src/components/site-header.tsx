import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FILE_INPUT_ID } from "@/components/upload-context";

type SiteHeaderProps = {
  trackCount: number;
  compact?: boolean;
};

export function SiteHeader({ trackCount, compact = false }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/95">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-serif text-lg tracking-tight text-fg">
            Listening Room
          </p>
          {compact ? (
            <p className="text-xs text-muted tabular-nums">
              {trackCount} {trackCount === 1 ? "track" : "tracks"}
            </p>
          ) : null}
        </div>
        {compact ? (
          <Button size="sm" asChild>
            <label htmlFor={FILE_INPUT_ID} className="cursor-pointer">
              <Upload className="size-4" />
              Add
            </label>
          </Button>
        ) : (
          <p className="hidden text-sm text-muted sm:block">Family mix</p>
        )}
      </div>
    </header>
  );
}
