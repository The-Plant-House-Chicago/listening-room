import { Upload } from "lucide-react";
import { CoverDisc } from "@/components/cover-disc";
import { Button } from "@/components/ui/button";
import { FILE_INPUT_ID } from "@/components/upload-context";
import { ShareMix } from "@/components/share-mix";

export function EmptyState() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="rise-1">
        <CoverDisc seed={42} title="Listening Room" size={148} />
      </div>
      <h1 className="rise-2 mt-8 font-serif text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
        Listening Room
      </h1>
      <p className="rise-3 mx-auto mt-4 max-w-sm text-base text-muted text-pretty">
        A private stereo for family and friends. Export a song from Suno, then add the MP3 from Downloads.
      </p>
      <div className="rise-4 mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" asChild>
          <label htmlFor={FILE_INPUT_ID} className="cursor-pointer">
            <Upload className="size-4" />
            Add a track
          </label>
        </Button>
        <ShareMix size="lg" variant="secondary" label="Invite family" />
      </div>
      <p className="rise-5 mt-4 max-w-xs text-sm text-subtle text-pretty">
        On your phone, tap Add a track and pick the file from Downloads. On a computer, you can also drop the file here.
      </p>
    </section>
  );
}
