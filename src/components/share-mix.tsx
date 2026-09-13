import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ShareMixProps = {
  size?: "icon" | "icon-sm" | "lg" | "sm";
  variant?: "ghost" | "secondary" | "default";
  label?: string;
};

export function ShareMix({
  size = "icon",
  variant = "ghost",
  label,
}: ShareMixProps) {
  async function share() {
    const url = window.location.href.split("#")[0] ?? window.location.href;
    const title = "Listening Room";
    const text = "Our family mix — add a Suno track and press play.";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied — send it to family");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied — send it to family");
      } catch {
        toast.error("Could not share the link");
      }
    }
  }

  return (
    <Button variant={variant} size={size} onClick={() => void share()} aria-label="Share mix">
      <Share2 className="size-4" />
      {label}
    </Button>
  );
}
