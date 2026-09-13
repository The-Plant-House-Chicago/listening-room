import { CoverDisc } from "@/components/cover-disc";
import type { PendingUpload } from "@/components/upload-context";

export function PendingRow({ item }: { item: PendingUpload }) {
  const pct = Math.round(item.progress * 100);
  const label = item.stage === "reading" ? "Preparing" : "Uploading";

  return (
    <article className="rounded-3xl bg-surface p-3 shadow-[var(--shadow-border)]">
      <div className="flex items-center gap-3">
        <CoverDisc seed={1} title={item.title} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-fg">{item.title}</p>
          <p className="text-sm text-muted">
            {label}
            <span className="tabular-nums"> {pct}%</span>
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
