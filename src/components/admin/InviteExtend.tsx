"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { extendActiveInvite } from "@/app/(app)/admin/invite/actions";
import { Icon } from "@/components/Icon";
import { fromLocalInput, toLocalInput } from "@/lib/datetime";
import { formatDateTime } from "@/lib/format";

const QUICK = [
  { days: 1, label: "+1 gün" },
  { days: 3, label: "+3 gün" },
  { days: 7, label: "+7 gün" },
];

/** Superadmin üçün: aktiv qeydiyyat linkinin müddətini uzatmaq. */
export function InviteExtend({ inviteId, expiresAt }: { inviteId: string; expiresAt: string }) {
  const router = useRouter();
  const [until, setUntil] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(change: { days?: number; until?: string }) {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await extendActiveInvite(inviteId, change);
        if (res.error) setMessage({ ok: false, text: res.error });
        else {
          setMessage({ ok: true, text: "Müddət uzadıldı." });
          setUntil("");
          router.refresh();
        }
      } catch {
        setMessage({ ok: false, text: "Əməliyyat alınmadı. Yenidən cəhd edin." });
      }
    });
  }

  return (
    <section className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon name="clock" className="size-5 text-brand-700" /> Müddəti uzat
      </h2>
      <p className="mt-1 text-sm text-muted">
        Hazırda {formatDateTime(expiresAt)} tarixinədək etibarlıdır. Link ən çox 30 gün açıq qala bilər.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {QUICK.map((q) => (
          <button
            key={q.days}
            type="button"
            disabled={pending}
            onClick={() => run({ days: q.days })}
            className="h-11 rounded-xl bg-brand-50 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Yeni bitmə vaxtı</span>
          <input
            type="datetime-local"
            value={until}
            min={toLocalInput(expiresAt)}
            onChange={(e) => setUntil(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        <button
          type="button"
          disabled={pending || !until}
          onClick={() => run({ until: fromLocalInput(until) ?? "" })}
          className="h-11 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50 disabled:opacity-50"
        >
          Tarixi təyin et
        </button>
      </div>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
