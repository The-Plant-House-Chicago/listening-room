import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "bg-surface text-fg border-border shadow-[var(--shadow-border)]",
          title: "text-fg",
          description: "text-muted",
        },
      }}
    />
  );
}
