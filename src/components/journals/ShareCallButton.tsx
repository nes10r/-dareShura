"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { shareCallAction } from "@/app/(app)/jurnallar/actions";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { TagInput } from "@/components/ui/TagInput";

const inputCls =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

/** Xüsusi buraxılış çağırışı paylaşmaq: jurnal kartından (jurnal adı hazır) və ya lentdən */
export function ShareCallButton({
  journal,
  suggestions = [],
  variant = "primary",
}: {
  journal?: { id: string; title: string; callsUrl?: string | null };
  suggestions?: string[];
  variant?: "primary" | "link";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [journalTitle, setJournalTitle] = useState(journal?.title ?? "");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setOpen(false), []);
  const today = new Date().toISOString().slice(0, 10);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await shareCallAction({ journalId: journal?.id ?? null, journalTitle, title, url, deadline, note, topics });
      if (res.error) return setError(res.error);
      setOpen(false);
      setDone(true);
      setTitle("");
      setUrl("");
      setDeadline("");
      setNote("");
      setTopics([]);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDone(false);
          setOpen(true);
        }}
        className={
          variant === "primary"
            ? "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 font-semibold text-white hover:bg-sky-800 sm:w-auto"
            : "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-50"
        }
      >
        <Icon name={done ? "check" : "plus"} className="size-4" /> {done ? "Paylaşıldı" : "Çağırış paylaş"}
      </button>

      <Sheet open={open} onClose={close} title="Xüsusi buraxılış çağırışı" subtitle={journal?.title}>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {journal?.callsUrl && (
            <a href={journal.callsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-sky-50 px-3.5 py-2.5 text-sm text-sky-900 ring-1 ring-sky-200">
              <Icon name="link" className="size-4 shrink-0" />
              <span>Jurnalın çağırışlar səhifəsini açın, uyğun olanın linkini bura köçürün</span>
            </a>
          )}
          {!journal && (
            <label className="block text-sm font-medium">
              Jurnal
              <input value={journalTitle} onChange={(e) => setJournalTitle(e.target.value)} maxLength={200} placeholder="Məs.: Energy Economics" className={inputCls} required />
            </label>
          )}
          <label className="block text-sm font-medium">
            Xüsusi buraxılışın mövzusu
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} placeholder="Məs.: Green Finance and Energy Transition" className={inputCls} required />
          </label>
          <label className="block text-sm font-medium">
            Çağırışın linki
            <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" inputMode="url" placeholder="https://…" className={inputCls} required />
          </label>
          <label className="block text-sm font-medium">
            Məqalə təqdimatının son tarixi
            <input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="date" min={today} className={inputCls} required />
          </label>
          <div>
            <span className="text-sm font-medium">Sahələr</span>
            <span className="block text-xs text-muted">Bu sahələri profilində qeyd edən üzvlər çağırışı ana səhifədə görəcək</span>
            <div className="mt-1.5">
              <TagInput value={topics} onChange={setTopics} suggestions={suggestions} max={6} placeholder="Məs.: Ekonometrika" />
            </div>
          </div>
          <label className="block text-sm font-medium">
            Qeyd <span className="font-normal text-muted">(istəyə bağlı)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 400))}
              rows={2}
              placeholder="Məs.: APC ödənişsizdir, qonaq redaktor tanışdır…"
              className={`${inputCls} h-auto resize-none py-3`}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-sky-700 font-semibold text-white hover:bg-sky-800 disabled:opacity-60">
            {pending ? "Paylaşılır…" : "Paylaş"}
          </button>
        </form>
      </Sheet>
    </>
  );
}
