"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { preconnect, preload } from "react-dom";

const VIDEO_ID = "gTzJzmKC8xk";
const START = 10;
const END = 52;
const IFRAME_ID = "hero-video";
const API_SRC = "https://www.youtube.com/iframe_api";

const EMBED_SRC =
  `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?` +
  new URLSearchParams({
    autoplay: "1", mute: "1", controls: "0", start: String(START), end: String(END), playsinline: "1",
    rel: "0", modestbranding: "1", iv_load_policy: "3", disablekb: "1", fs: "0", enablejsapi: "1",
  });

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
      s.src = API_SRC;
      document.head.appendChild(s);
    }
  });
}

/**
 * Hero fon videosu: YouTube videosunun 10–52-ci saniyələri səssiz, fasiləsiz dövrədə.
 *
 * Sürət üçün iframe birbaşa HTML-də gəlir — video JS yüklənməsini gözləmədən səhifə ilə
 * paralel yüklənməyə başlayır. YouTube API yalnız dövrə (52 → 10 san.) və "oynayır" anını
 * bilmək üçün sonradan mövcud iframe-ə qoşulur. O vaxta qədər poster şəkli görünür.
 */
export function HeroVideo({ poster }: { poster: string }) {
  // Bağlantıları HTML-in özündə əvvəlcədən açır
  preconnect("https://www.youtube-nocookie.com");
  preconnect("https://www.youtube.com");
  preconnect("https://i.ytimg.com");
  preload(API_SRC, { as: "script" });

  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    loadYouTubeApi().then(() => {
      if (cancelled) return;
      new window.YT.Player(IFRAME_ID, {
        events: {
          onReady: (e: any) => {
            if (reduceMotion) return e.target.pauseVideo();
            e.target.mute();
            e.target.playVideo();
          },
          onStateChange: (e: any) => {
            if (e.data === 1 && !reduceMotion) setPlaying(true);
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
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-brand-900" aria-hidden="true">
      <Image src={poster} alt="" fill priority sizes="100vw" className="object-cover" />
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.2] transition-opacity duration-700 ${
          playing ? "opacity-100" : "opacity-0"
        }`}
      >
        <iframe
          id={IFRAME_ID}
          src={EMBED_SRC}
          title="UNEC kampusu"
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          className="size-full border-0"
        />
      </div>
    </div>
  );
}
