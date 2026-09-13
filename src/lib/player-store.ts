import { create } from "zustand";
import { toast } from "sonner";
import { audioSrc, type Track } from "@/lib/track-types";

type RepeatMode = "all" | "one";

type PlayerState = {
  queue: Track[];
  currentId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeat: RepeatMode;
  setQueue: (tracks: Track[]) => void;
  playTrack: (track: Track, startAt?: number) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  next: () => void;
  prev: () => void;
  cycleRepeat: () => void;
  stopIfCurrent: (id: string) => void;
};


let media: HTMLVideoElement | null = null;
let loadGen = 0;

function getMedia(): HTMLVideoElement | null {
  if (typeof window === "undefined") return null;
  if (!media) {
    const el = document.createElement("video");
    el.preload = "auto";
    el.playsInline = true;
    el.controls = false;
    el.disablePictureInPicture = true;
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.setAttribute("controlslist", "nodownload nofullscreen noremoteplayback");
    el.setAttribute("aria-hidden", "true");
    el.tabIndex = -1;
    el.style.position = "fixed";
    el.style.width = "1px";
    el.style.height = "1px";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.bottom = "0";
    el.style.left = "0";
    el.style.zIndex = "-1";
    document.body.appendChild(el);

    el.addEventListener("timeupdate", () => {
      usePlayer.setState({
        currentTime: el.currentTime ?? 0,
        duration: Number.isFinite(el.duration) ? el.duration : 0,
      });
      updatePositionState(el);
    });
    el.addEventListener("loadedmetadata", () => {
      usePlayer.setState({
        duration: Number.isFinite(el.duration) ? el.duration : 0,
      });
    });
    el.addEventListener("play", () => {
      usePlayer.setState({ isPlaying: true });
      setPlaybackState("playing");
    });
    el.addEventListener("pause", () => {
      usePlayer.setState({ isPlaying: false });
      setPlaybackState("paused");
    });
    el.addEventListener("ended", () => {
      const player = usePlayer.getState();
      if (player.repeat === "one") {
        el.currentTime = 0;
        void el.play().catch(() => undefined);
        return;
      }
      player.next();
    });
    el.addEventListener("error", () => {
      usePlayer.setState({ isPlaying: false });
      toast.error("Could not play that track");
    });

    bindMediaSessionActions();
    media = el;
  }
  return media;
}

function setPlaybackState(state: MediaSessionPlaybackState) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = state;
  } catch {
    /* ignore */
  }
}

function updatePositionState(el: HTMLMediaElement) {
  if (!("mediaSession" in navigator)) return;
  if (!Number.isFinite(el.duration) || el.duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: el.duration,
      playbackRate: 1,
      position: Math.min(Math.max(0, el.currentTime), el.duration),
    });
  } catch {
    /* ignore */
  }
}

function bindMediaSessionActions() {
  if (!("mediaSession" in navigator)) return;
  const set = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      /* unsupported on this browser */
    }
  };
  set("play", () => {
    void getMedia()?.play().catch(() => undefined);
  });
  set("pause", () => {
    getMedia()?.pause();
  });
  set("previoustrack", () => usePlayer.getState().prev());
  set("nexttrack", () => usePlayer.getState().next());
  set("seekto", (details) => {
    if (typeof details.seekTime === "number") usePlayer.getState().seek(details.seekTime);
  });
  set("seekbackward", (details) => {
    const el = getMedia();
    if (!el) return;
    el.currentTime = Math.max(0, el.currentTime - (details.seekOffset ?? 10));
  });
  set("seekforward", (details) => {
    const el = getMedia();
    if (!el) return;
    const dur = Number.isFinite(el.duration) ? el.duration : el.currentTime + 10;
    el.currentTime = Math.min(dur, el.currentTime + (details.seekOffset ?? 10));
  });
}

function publishMetadata(track: Track) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || "Family mix",
      album: "Listening Room",
    });
  } catch {
    /* ignore */
  }
}

function loadAndPlay(track: Track, startAt = 0) {
  const el = getMedia();
  if (!el) return;
  const nextSrc = audioSrc(track.id);
  const current = el.getAttribute("src") ?? el.src;
  const alreadyLoaded = current === nextSrc || current.endsWith(nextSrc);
  const gen = ++loadGen;

  publishMetadata(track);
  usePlayer.setState({
    currentId: track.id,
    duration: track.durationMs / 1000,
    currentTime: startAt,
    isPlaying: false,
  });

  const start = () => {
    if (gen !== loadGen) return;
    if (startAt > 0) {
      try {
        el.currentTime = startAt;
      } catch {
        /* ignore */
      }
    }
    void el.play().catch(() => {
      if (gen !== loadGen) return;
      usePlayer.setState({ isPlaying: false });
    });
  };

  if (!alreadyLoaded) {
    el.src = nextSrc;
    el.addEventListener("loadedmetadata", start, { once: true });
    el.load();
  } else {
    el.currentTime = startAt;
    start();
  }
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  currentId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  repeat: "all",
  setQueue: (tracks) => set({ queue: tracks }),
  playTrack: (track, startAt = 0) => {
    loadAndPlay(track, startAt);
  },
  toggle: () => {
    const el = getMedia();
    if (!el) return;
    const { currentId, queue } = get();
    if (!currentId) {
      const first = queue[0];
      if (first) loadAndPlay(first);
      return;
    }
    if (el.ended || (el.duration && el.currentTime >= el.duration - 0.05)) {
      el.currentTime = 0;
      void el.play().catch(() => undefined);
      return;
    }
    if (el.paused) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  },
  seek: (seconds) => {
    const el = getMedia();
    if (!el) return;
    el.currentTime = Math.max(0, seconds);
    set({ currentTime: el.currentTime });
  },
  next: () => {
    const { queue, currentId } = get();
    if (queue.length === 0) return;
    const index = queue.findIndex((t) => t.id === currentId);
    if (queue.length === 1) {
      const el = getMedia();
      if (el) {
        el.currentTime = 0;
        void el.play().catch(() => undefined);
      }
      return;
    }
    const nextTrack = queue[(index + 1 + queue.length) % queue.length];
    if (nextTrack) loadAndPlay(nextTrack);
  },
  prev: () => {
    const { queue, currentId, currentTime } = get();
    const el = getMedia();
    if (currentTime > 3 && el) {
      el.currentTime = 0;
      return;
    }
    if (queue.length === 0) return;
    const index = queue.findIndex((t) => t.id === currentId);
    const prevTrack = queue[(index - 1 + queue.length) % queue.length];
    if (prevTrack) loadAndPlay(prevTrack);
  },
  cycleRepeat: () => {
    set({ repeat: get().repeat === "all" ? "one" : "all" });
  },
  stopIfCurrent: (id) => {
    if (get().currentId !== id) return;
    const el = getMedia();
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    loadGen += 1;
    set({ currentId: null, isPlaying: false, currentTime: 0, duration: 0 });
    setPlaybackState("none");
  },
}));
