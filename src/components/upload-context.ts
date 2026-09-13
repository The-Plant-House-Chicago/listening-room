import { createContext, useContext } from "react";

export const FILE_INPUT_ID = "listening-room-file";

export type PendingUpload = {
  key: string;
  title: string;
  progress: number;
  stage: "reading" | "uploading";
};

export type UploadContextValue = {
  openPicker: () => void;
  pending: PendingUpload[];
  dragging: boolean;
};

export const UploadContext = createContext<UploadContextValue | null>(null);

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used within UploadProvider");
  return ctx;
}
