import { cn } from "@/lib/utils";

type CoverDiscProps = {
  seed: number;
  title: string;
  size?: number;
  playing?: boolean;
  className?: string;
};

export function CoverDisc({
  seed,
  title,
  size = 56,
  playing = false,
  className,
}: CoverDiscProps) {
  const rot = seed % 360;
  const a1 = 20 + (seed % 50);
  const a2 = 70 + ((seed >> 3) % 80);
  const rings = 3 + (seed % 3);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn(
        "shrink-0 text-fg",
        playing && "animate-[spin_8s_linear_infinite] motion-reduce:animate-none",
        className,
      )}
    >
      <title>{title}</title>
      <circle cx="50" cy="50" r="49" fill="currentColor" opacity="0.14" />
      <circle
        cx="50"
        cy="50"
        r="47.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.4"
      />
      {Array.from({ length: rings }, (_, i) => (
        <circle
          key={i}
          cx="50"
          cy="50"
          r={42 - i * 5}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="0.6"
        />
      ))}
      <g transform={`rotate(${rot} 50 50)`}>
        <path
          d={`M50 50 L50 28 A22 22 0 0 1 ${50 + 22 * Math.cos((a1 * Math.PI) / 180)} ${50 - 22 * Math.sin((a1 * Math.PI) / 180)} Z`}
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d={`M50 50 L${50 + 18 * Math.cos((a2 * Math.PI) / 180)} ${50 - 18 * Math.sin((a2 * Math.PI) / 180)} A18 18 0 0 1 50 32 Z`}
          fill="currentColor"
          opacity="0.28"
        />
      </g>
      <circle cx="50" cy="50" r="16" fill="currentColor" opacity="0.12" />
      <circle
        cx="50"
        cy="50"
        r="15"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1"
      />
      <circle cx="50" cy="50" r="3.2" fill="currentColor" opacity="0.7" />
      <circle cx="50" cy="50" r="1.4" fill="var(--color-bg)" />
    </svg>
  );
}
