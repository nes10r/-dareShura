"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { sendCollabRequest } from "@/app/(app)/tedqiqatcilar/actions";
import { Icon } from "@/components/Icon";

/**
 * "Birgə işləmək təklif et": mobil — aşağıdan açılan panel, kompüter — mərkəzdə dialoq.
 * Mövzu üçün qarşı tərəfin sahələri hazır seçim kimi təklif olunur (ortaq sahələr əvvəl).
 */
export function CollabRequestButton({
  toUserId,
  toName,
  topics,
  shared,
  full = false,
}: {
  toUserId: string;
  toName: string;
  topics: string[];
  shared: string[];
  full?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(shared[0] ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ordered = [...shared, ...topics.filter((t) => !shared.includes(t))];

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await sendCollabRequest(toUserId, topic, message);
      if (res.error) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99] ${full ? "w-full" : ""}`}
      >
        <Icon name="users" className="size-5" /> Birgə işləmək təklif et
      </button>

      {open && (
        <div className="animate-fade fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="collab-title" className="animate-sheet sm:animate-pop w-full max-w-lg rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="collab-title" className="text-lg font-bold">Birgə işləmək təklifi</h2>
                <p className="text-sm text-muted">{toName}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-slate-100" aria-label="Bağla">
                <Icon name="x" className="size-5" />
              </button>
            </div>

            <label className="mt-5 block text-sm font-medium" htmlFor="collab-topic">
              Mövzu
            </label>
            {ordered.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ordered.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    aria-pressed={topic === t}
                    className={`inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium transition ${
                      topic === t ? "bg-emerald-600 text-white" : shared.includes(t) ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {shared.includes(t) && topic !== t && <Icon name="check" className="size-3.5" />}
                    {t}
                  </button>
                ))}
              </div>
            )}
            <input
              id="collab-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 80))}
              placeholder="və ya öz mövzunuzu yazın"
              className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            {shared.length > 0 && <p className="mt-1.5 text-xs text-emerald-700">✓ işarəli sahələr hər ikinizin profilində var</p>}

            <label className="mt-4 block text-sm font-medium" htmlFor="collab-msg">
              Qısa mesaj <span className="font-normal text-muted">(istəyə bağlı)</span>
            </label>
            <textarea
              id="collab-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 600))}
              rows={4}
              placeholder="Məs.: Rəqəmsal maliyyə üzrə birgə məqalə və ya qrant layihəsi hazırlamağı təklif edirəm…"
              className="mt-1.5 w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <p className="mt-1 text-xs text-muted">Təklif qəbul edilərsə, e-poçt ünvanlarınız bir-birinizə görünəcək.</p>

            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={send}
              disabled={pending || topic.trim().length < 2}
              className="mt-4 h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? "Göndərilir…" : "Təklifi göndər"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
