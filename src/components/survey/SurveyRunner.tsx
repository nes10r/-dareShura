"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitSurvey } from "@/app/(app)/surveys/actions";
import { Icon } from "@/components/Icon";
import type { AnswerValue, Question } from "@/lib/types";

interface Props {
  userId: string;
  survey: { id: string; title: string; description: string; questions: Question[] };
  minutes: number;
  deadline: string | null;
}

type Answers = Record<string, AnswerValue>;

function isAnswered(q: Question, v: AnswerValue | undefined) {
  if (v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

/**
 * Mobil-yönümlü "fokus rejimi": hər ekranda bir sual, böyük toxunma sahələri,
 * irəliləyiş göstəricisi və avtomatik yadda saxlama (səhifə bağlansa belə davam etmək olur).
 */
export function SurveyRunner({ userId, survey, minutes, deadline }: Props) {
  const router = useRouter();
  const draftKey = `survey-draft:${userId}:${survey.id}`;
  const total = survey.questions.length;

  const [step, setStep] = useState(-1); // -1 = giriş ekranı, total = uğurlu göndəriş
  const [answers, setAnswers] = useState<Answers>({});
  const [hasDraft, setHasDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Yarımçıq cavabları bərpa et
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) ?? "null");
      if (saved?.answers && Object.keys(saved.answers).length) {
        setAnswers(saved.answers);
        setHasDraft(true);
      }
    } catch {}
  }, [draftKey]);

  useEffect(() => {
    if (step < 0 || step >= total) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ answers, step }));
    } catch {}
  }, [answers, step, draftKey, total]);

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const question = step >= 0 && step < total ? survey.questions[step] : null;
  const value = question ? answers[question.id] : undefined;
  const canContinue = !question || !question.required || isAnswered(question, value);
  const isLast = step === total - 1;
  const answeredCount = survey.questions.filter((q) => isAnswered(q, answers[q.id])).length;

  function setAnswer(q: Question, v: AnswerValue, autoAdvance = false) {
    setAnswers((prev) => ({ ...prev, [q.id]: v }));
    setError(null);
    clearTimeout(advanceTimer.current);
    if (autoAdvance && step < total - 1) {
      advanceTimer.current = setTimeout(() => setStep((s) => s + 1), 280);
    }
  }

  function start() {
    if (hasDraft) {
      const firstOpen = survey.questions.findIndex((q) => q.required && !isAnswered(q, answers[q.id]));
      setStep(firstOpen === -1 ? total - 1 : firstOpen);
    } else setStep(0);
  }

  function next() {
    clearTimeout(advanceTimer.current);
    if (!canContinue) return;
    if (!isLast) return setStep(step + 1);

    startTransition(async () => {
      const res = await submitSurvey(survey.id, answers);
      if (res.ok) {
        try {
          localStorage.removeItem(draftKey);
        } catch {}
        setStep(total);
        router.refresh(); // naviqasiya badge-i və dashboard kartları yenilənsin
      } else {
        setError(res.error);
        const firstBad = survey.questions.findIndex((q) => res.fieldErrors?.[q.id]);
        if (firstBad >= 0) setStep(firstBad);
      }
    });
  }

  // ---------- Giriş ekranı ----------
  if (step === -1) {
    return (
      <Screen>
        <TopBar />
        <div className="flex flex-1 flex-col px-5 pb-6 pt-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon name="survey" className="size-7" />
          </span>
          <h1 ref={headingRef} tabIndex={-1} className="mt-5 text-2xl font-bold leading-tight outline-none">
            {survey.title}
          </h1>
          {survey.description && <p className="mt-3 text-muted">{survey.description}</p>}
          <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
            <Stat label="Sual" value={String(total)} />
            <Stat label="Vaxt" value={`~${minutes} dəq`} />
            <Stat label="Son tarix" value={deadline ?? "—"} small />
          </dl>
          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <li className="flex gap-3"><Icon name="check" className="size-5 shrink-0 text-emerald-600" />Hər ekranda bir sual — sürətli və rahat</li>
            <li className="flex gap-3"><Icon name="check" className="size-5 shrink-0 text-emerald-600" />Cavablarınız avtomatik yadda saxlanılır</li>
            <li className="flex gap-3"><Icon name="lock" className="size-5 shrink-0 text-emerald-600" />Nəticələr ümumiləşdirilmiş formada təhlil olunur</li>
          </ul>
        </div>
        <BottomBar>
          <PrimaryButton onClick={start}>
            {hasDraft ? `Davam et (${answeredCount}/${total})` : "Başla"} <Icon name="arrow-right" className="size-4" />
          </PrimaryButton>
        </BottomBar>
      </Screen>
    );
  }

  // ---------- Uğur ekranı ----------
  if (step >= total) {
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="animate-pop grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <Icon name="check" className="size-10" />
          </span>
          <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-2xl font-bold outline-none">Təşəkkür edirik!</h1>
          <p className="mt-2 max-w-sm text-muted">Cavablarınız qeydə alındı. Rəyiniz platformanın inkişafı üçün çox dəyərlidir.</p>
        </div>
        <BottomBar>
          <Link
            href="/dashboard"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-700 text-base font-semibold text-white transition hover:bg-brand-800"
          >
            Ana səhifəyə qayıt
          </Link>
        </BottomBar>
      </Screen>
    );
  }

  // ---------- Sual ekranı ----------
  const q = question!;
  return (
    <Screen>
      <TopBar progress={(step + (canContinue && isAnswered(q, value) ? 1 : 0)) / total} label={`${step + 1} / ${total}`} />

      <div key={q.id} className="animate-pop flex-1 px-5 pb-6 pt-6">
        <p className="text-sm font-medium text-brand-700">
          Sual {step + 1}
          {!q.required && <span className="ml-2 font-normal text-muted">· məcburi deyil</span>}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-xl font-bold leading-snug outline-none sm:text-2xl">
          {q.title}
        </h1>
        {q.description && <p className="mt-2 text-sm text-muted">{q.description}</p>}

        <div className="mt-6">
          {q.type === "single" && (
            <div role="radiogroup" aria-label={q.title} className="space-y-2.5">
              {q.options?.map((opt) => (
                <Choice key={opt} type="radio" label={opt} checked={value === opt} onSelect={() => setAnswer(q, opt, true)} />
              ))}
            </div>
          )}

          {q.type === "multiple" && (
            <div role="group" aria-label={q.title} className="space-y-2.5">
              {q.options?.map((opt) => {
                const list = Array.isArray(value) ? value : [];
                const checked = list.includes(opt);
                return (
                  <Choice
                    key={opt}
                    type="checkbox"
                    label={opt}
                    checked={checked}
                    onSelect={() => setAnswer(q, checked ? list.filter((x) => x !== opt) : [...list, opt])}
                  />
                );
              })}
            </div>
          )}

          {q.type === "scale" && (
            <div>
              <div role="radiogroup" aria-label={q.title} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${q.scaleMax ?? 5}, minmax(0, 1fr))` }}>
                {Array.from({ length: q.scaleMax ?? 5 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={value === n}
                    onClick={() => setAnswer(q, n, true)}
                    className={`aspect-square max-h-16 rounded-2xl text-lg font-bold transition active:scale-95 ${
                      value === n ? "bg-brand-700 text-white shadow-md shadow-brand-700/30" : "bg-white text-ink ring-1 ring-line hover:ring-brand-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {(q.scaleMinLabel || q.scaleMaxLabel) && (
                <div className="mt-3 flex justify-between gap-4 text-xs text-muted">
                  <span>{q.scaleMinLabel}</span>
                  <span className="text-right">{q.scaleMaxLabel}</span>
                </div>
              )}
            </div>
          )}

          {q.type === "text" && (
            <div>
              <textarea
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setAnswer(q, e.target.value.slice(0, 2000))}
                rows={5}
                placeholder="Cavabınızı yazın…"
                aria-label={q.title}
                className="w-full resize-none rounded-2xl border border-line bg-white p-4 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
              <p className="mt-1 text-right text-xs text-muted">{typeof value === "string" ? value.length : 0} / 2000</p>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
      </div>

      <BottomBar>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="grid h-12 w-14 shrink-0 place-items-center rounded-xl bg-white text-ink ring-1 ring-line transition hover:bg-slate-50"
            aria-label="Əvvəlki sual"
          >
            <Icon name="chevron-left" />
          </button>
          <PrimaryButton onClick={next} disabled={!canContinue || pending}>
            {pending ? "Göndərilir…" : isLast ? "Cavabları göndər" : !q.required && !isAnswered(q, value) ? "Keç" : "Növbəti"}
            {!pending && !isLast && <Icon name="arrow-right" className="size-4" />}
          </PrimaryButton>
        </div>
      </BottomBar>
    </Screen>
  );
}

// ---------- Kiçik komponentlər ----------

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-surface sm:py-8">
      <div className="mx-auto flex min-h-full max-w-xl flex-col bg-surface sm:min-h-0 sm:rounded-3xl sm:bg-white sm:shadow-xl sm:ring-1 sm:ring-line">
        {children}
      </div>
    </div>
  );
}

function TopBar({ progress, label }: { progress?: number; label?: string }) {
  return (
    <div className="sticky top-0 z-10 bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur sm:rounded-t-3xl sm:bg-white/95">
      <div className="flex h-14 items-center gap-3 px-3">
        <Link href="/dashboard" className="grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Bağla (cavablar yadda saxlanılır)">
          <Icon name="x" />
        </Link>
        {progress !== undefined && (
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
        )}
        {label && <span className="w-14 text-right text-sm font-medium tabular-nums text-muted">{label}</span>}
      </div>
    </div>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 border-t border-line bg-white/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:rounded-b-3xl">
      {children}
    </div>
  );
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-12 flex-1 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-base font-semibold text-white transition hover:bg-brand-800 active:scale-[0.99] disabled:bg-slate-300 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-line sm:bg-surface sm:ring-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${small ? "text-sm" : ""}`}>{value}</dd>
    </div>
  );
}

function Choice({ type, label, checked, onSelect }: { type: "radio" | "checkbox"; label: string; checked: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role={type}
      aria-checked={checked}
      onClick={onSelect}
      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base transition active:scale-[0.99] ${
        checked ? "bg-brand-50 font-medium text-brand-800 ring-2 ring-brand-600" : "bg-white ring-1 ring-line hover:ring-brand-300"
      }`}
    >
      <span
        className={`grid size-6 shrink-0 place-items-center border-2 transition ${type === "radio" ? "rounded-full" : "rounded-md"} ${
          checked ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"
        }`}
      >
        {checked && (type === "radio" ? <span className="size-2 rounded-full bg-white" /> : <Icon name="check" className="size-4" />)}
      </span>
      {label}
    </button>
  );
}
