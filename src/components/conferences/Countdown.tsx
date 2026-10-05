"use client";

import { useEffect, useState } from "react";

const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;
const pad = (n: number) => String(n).padStart(2, "0");

function parts(ms: number) {
  return { d: Math.floor(ms / DAY), h: Math.floor((ms % DAY) / HOUR), m: Math.floor((ms % HOUR) / MIN), s: Math.floor((ms % MIN) / SEC) };
}

/**
 * Canlı geri sayım. Server və client vaxtı fərqli olduğu üçün (hydration) ilk göstərişdə
 * `fallback` (məs. tarix) göstərilir, sayğac brauzerdə işə düşür.
 */
export function Countdown({
  target,
  variant = "inline",
  fallback = null,
  expired = "Müddət bitib",
}: {
  target: string;
  variant?: "inline" | "boxes";
  fallback?: React.ReactNode;
  expired?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  const t = Date.parse(target);

  useEffect(() => {
    setNow(Date.now());
    // Gün qalanda dəqiqədə bir, son gündə hər saniyə
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, variant === "boxes" || t - Date.now() < DAY ? SEC : 30 * SEC);
    return () => clearInterval(id);
  }, [t, variant]);

  if (now === null) return <>{fallback}</>;
  const ms = t - now;
  if (ms <= 0) return <span>{expired}</span>;
  const { d, h, m, s } = parts(ms);

  if (variant === "boxes") {
    const cells = [
      { v: d, l: "gün" },
      { v: h, l: "saat" },
      { v: m, l: "dəq" },
      { v: s, l: "san" },
    ];
    return (
      <span className="grid grid-cols-4 gap-2" role="timer" aria-label={`${d} gün ${h} saat ${m} dəqiqə qalıb`}>
        {cells.map((c) => (
          <span key={c.l} className="rounded-xl bg-white/15 px-2 py-2.5 text-center ring-1 ring-white/20">
            <span className="block text-2xl font-bold tabular-nums leading-none sm:text-3xl">{c.l === "gün" ? c.v : pad(c.v)}</span>
            <span className="mt-1 block text-[11px] uppercase tracking-wider opacity-75">{c.l}</span>
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="tabular-nums" role="timer">
      {d > 0 ? `${d} gün ${pad(h)} saat ${pad(m)} dəq` : `${pad(h)}:${pad(m)}:${pad(s)}`}
    </span>
  );
}
