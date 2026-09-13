import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-lg bg-surface px-3 text-sm text-fg",
        "ring-1 ring-border outline-none",
        "placeholder:text-subtle",
        "focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
