"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const VIDEO_ID = "gTzJzmKC8xk";
const START = 10;
const END = 52;

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

/**
 * Hero fon videosu: YouTube videosunun 10–52-ci saniyələri səssiz, fasiləsiz dövrədə.
 * Video yüklənənə qədər (və ya "reduced motion" aktivdirsə) poster şəkli göstərilir.
 */
export function HeroVideo({ poster }: { poster: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const container = containerRef.current;
    if (!container) return;

    let player: any;
    let cancelled = false;
    // YouTube hədəf elementi iframe ilə əvəz edir — React-in idarə etmədiyi ayrıca element yaradırıq
    const target = document.createElement("div");
    container.appendChild(target);

    loadYouTubeApi().then(() => {
      if (cancelled) return;
      player = new window.YT.Player(target, {
        videoId: VIDEO_ID,
        width: "100%",
        height: "100%",
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, start: START, end: END, playsinline: 1,
          rel: 0, modestbranding: 1, disablekb: 1, iv_load_policy: 3, fs: 0,
        },
        events: {
          onReady: (e: any) => {
            e.target.mute();
            e.target.playVideo();
          },
          onStateChange: (e: any) => {
            if (e.data === 1) setPlaying(true);
            // 52-ci saniyədə bitir → 10-cu saniyəyə qayıt
            if (e.data === 0) {
              e.target.seekTo(START, true);
              e.target.playVideo();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      player?.destroy?.();
      container.innerHTML = "";
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-brand-900" aria-hidden="true">
      <Image src={poster} alt="" fill priority sizes="100vw" className="object-cover" />
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.2] transition-opacity duration-1000 ${
          playing ? "opacity-100" : "opacity-0"
        }`}
      >
        <div ref={containerRef} className="size-full [&>iframe]:size-full" />
      </div>
    </div>
  );
}
