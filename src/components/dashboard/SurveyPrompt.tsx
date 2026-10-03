"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

interface Props {
  surveyId: string;
  title: string;
  questionCount: number;
  minutes: number;
  deadline: string | null;
  urgency: string | null;
  /** Bu istifadəçinin cavablandırmadığı sorğuların ümumi sayı */
  pendingCount: number;
}

const storageKey = (id: string) => `survey-prompt-dismissed:${id}`;

/**
 * Cavablandırılmamış sorğu olduqda dashboard-a girişdə açılan bildiriş.
 * Mobil: aşağıdan çıxan "bottom sheet"; desktop: mərkəzdə dialoq.
 * "Sonra" seçilərsə həmin sessiya ərzində yenidən narahat etmir — kart dashboard-da qalır.
 */
export function SurveyPrompt({ surveyId, title, questionCount, minutes, deadline, urgency, pendingCount }: Props) {
  const [open, setOpen] = useState(false);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(storageKey(surveyId)) === "1";
    } catch {}
    if (dismissed) return;
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [surveyId]);

  useEffect(() => {
    if (!open) return;
    ctaRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    try {
      sessionStorage.setItem(storageKey(surveyId), "1");
    } catch {}
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <button aria-label="Bağla" className="animate-fade absolute inset-0 bg-slate-900/50" onClick={dismiss} tabIndex={-1} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-prompt-title"
        className="animate-sheet sm:animate-pop relative w-full max-w-md rounded-t-3xl bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-muted hover:bg-slate-100"
          aria-label="Bağla"
        >
          <Icon name="x" />
        </button>

        <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon name="survey" className="size-7" />
        </span>
        <p className="mt-4 text-sm font-medium text-brand-700">
          {pendingCount > 1 ? `Sizi ${pendingCount} sorğu gözləyir` : "Sizin üçün yeni sorğu var"}
        </p>
        <h2 id="survey-prompt-title" className="mt-1 text-xl font-bold leading-snug">{title}</h2>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-xs text-muted">Sual</dt>
            <dd className="mt-0.5 font-semibold">{questionCount}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-xs text-muted">Vaxt</dt>
            <dd className="mt-0.5 font-semibold">~{minutes} dəq</dd>
          </div>
          <div className={`rounded-xl p-3 ${urgency ? "bg-amber-50" : "bg-surface"}`}>
            <dt className="text-xs text-muted">Son tarix</dt>
            <dd className={`mt-0.5 text-sm font-semibold ${urgency ? "text-amber-700" : ""}`}>{urgency ?? deadline ?? "—"}</dd>
          </div>
        </dl>

        <Link
          ref={ctaRef}
          href={`/surveys/${surveyId}`}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-base font-semibold text-white transition hover:bg-brand-800 active:scale-[0.99]"
        >
          Sorğuda iştirak et <Icon name="arrow-right" className="size-4" />
        </Link>
        <button onClick={dismiss} className="mt-2 h-11 w-full rounded-xl text-sm font-medium text-muted hover:bg-slate-50">
          Sonra xatırlat
        </button>
      </div>
    </div>
  );
}
