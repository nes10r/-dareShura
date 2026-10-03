"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

function remaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} saat ${m} dəq` : `${m} dəq`;
}

/** Aktiv dəvət linki: kopyala, paylaş (mobil), qalan vaxt. */
export function InviteLinkCard({ url, expiresAt }: { url: string; expiresAt: string }) {
  const [left, setLeft] = useState<string | null>(() => remaining(expiresAt));
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
    const t = setInterval(() => setLeft(remaining(expiresAt)), 30_000);
    return () => clearInterval(t);
  }, [expiresAt]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Linki kopyalayın:", url);
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "UNEC Alimlər Şurası — qeydiyyat", text: "Platformada qeydiyyat üçün link (24 saat etibarlıdır):", url });
    } catch {}
  }

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Aktiv
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted">
          <Icon name="clock" className="size-4" /> {left ? `${left} qalıb` : "Müddəti bitdi"}
        </span>
      </div>

      <p className="mt-4 break-all rounded-xl bg-surface px-3.5 py-3 font-mono text-sm text-slate-700 select-all">{url}</p>

      <div className="mt-3 grid gap-2 sm:flex">
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white transition hover:bg-brand-800 active:scale-[0.99]"
        >
          <Icon name={copied ? "check" : "file"} className="size-5" /> {copied ? "Kopyalandı" : "Linki kopyala"}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={share}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white font-semibold ring-1 ring-line transition hover:bg-slate-50"
          >
            <Icon name="arrow-right" className="size-5" /> Paylaş
          </button>
        )}
      </div>
    </div>
  );
}
