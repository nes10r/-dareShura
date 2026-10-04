"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveSurvey, type SurveyInput } from "@/app/(app)/admin/surveys/actions";
import { Icon } from "@/components/Icon";
import { estimateMinutes } from "@/lib/surveys/service";
import { facultyList } from "@/lib/faculties";
import { ROLE_LABELS, type Question, type QuestionType, type Role } from "@/lib/types";

interface Props {
  id: string | null;
  isTemplate: boolean;
  initial: SurveyInput;
  /** Auditoriyanın canlı hesablanması üçün (yalnız rol və fakültə) */
  people: { role: Role; faculty: string }[];
  /** Dərc olunmuş sorğunun redaktəsi: status dəyişmir, yalnız "yadda saxla" */
  published?: boolean;
  /** Mövcud cavabların sayı — redaktə zamanı xəbərdarlıq üçün */
  responseCount?: number;
}

// Azərbaycan vaxtı (UTC+4, yay vaxtı yoxdur) — server və client eyni dəyəri göstərir
const BAKU_OFFSET = 4 * 60 * 60 * 1000;
const toLocalInput = (iso: string | null) => (iso ? new Date(Date.parse(iso) + BAKU_OFFSET).toISOString().slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? new Date(`${v}:00+04:00`).toISOString() : null);

const TYPE_OPTIONS: { type: QuestionType; label: string }[] = [
  { type: "single", label: "Tək seçim" },
  { type: "multiple", label: "Çox seçim" },
  { type: "scale", label: "Şkala" },
  { type: "text", label: "Açıq cavab" },
];

let counter = 0;
const tempId = () => `q_${Date.now().toString(36)}${(counter++).toString(36)}`;

function blankQuestion(type: QuestionType): Question {
  return {
    id: tempId(),
    type,
    title: "",
    required: type !== "text",
    ...(type === "single" || type === "multiple" ? { options: ["", ""] } : {}),
    ...(type === "scale" ? { scaleMax: 5, scaleMinLabel: "", scaleMaxLabel: "" } : {}),
  };
}

const inputCls =
  "w-full rounded-xl border border-line bg-white px-3.5 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export function SurveyEditor({ id, isTemplate, initial, people, published = false, responseCount = 0 }: Props) {
  const router = useRouter();
  const [s, setS] = useState<SurveyInput>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const faculties = useMemo(() => facultyList(people.map((p) => p.faculty)), [people]);

  const audienceSize = useMemo(() => {
    const a = s.audience;
    if (a.all) return people.length;
    return people.filter((p) => a.roles.includes(p.role) || a.faculties.includes(p.faculty)).length;
  }, [s.audience, people]);

  const patch = (p: Partial<SurveyInput>) => setS((prev) => ({ ...prev, ...p }));
  const patchQ = (i: number, p: Partial<Question>) =>
    setS((prev) => ({ ...prev, questions: prev.questions.map((q, j) => (j === i ? { ...q, ...p } : q)) }));
  const moveQ = (i: number, dir: -1 | 1) =>
    setS((prev) => {
      const qs = [...prev.questions];
      const j = i + dir;
      if (j < 0 || j >= qs.length) return prev;
      [qs[i], qs[j]] = [qs[j], qs[i]];
      return { ...prev, questions: qs };
    });
  const removeQ = (i: number) => setS((prev) => ({ ...prev, questions: prev.questions.filter((_, j) => j !== i) }));
  const changeType = (i: number, type: QuestionType) => {
    const q = s.questions[i];
    patchQ(i, { ...blankQuestion(type), id: q.id, title: q.title, description: q.description, options: q.options?.length ? q.options : blankQuestion(type).options });
  };

  function toggle<T>(list: T[], v: T) {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  function submit(intent: "draft" | "publish" | "template") {
    setErrors([]);
    startTransition(async () => {
      const res = await saveSurvey(id, s, intent);
      if (!res.ok) {
        setErrors(res.errors);
        return;
      }
      if (published) router.push(`/admin/surveys/${res.id}?updated=1`);
      else if (intent === "publish") router.push(`/admin/surveys/${res.id}?published=${res.audienceSize ?? 0}`);
      else if (!id) router.replace(`/admin/surveys/${res.id}?saved=1`);
      else {
        router.refresh();
        setErrors([]);
      }
    });
  }

  return (
    <div className="space-y-5">
      {published && responseCount > 0 && (
        <p className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <Icon name="bell" className="mt-0.5 size-5 shrink-0" />
          <span>
            Bu sorğuya artıq <b>{responseCount}</b> cavab verilib. Mətnləri və son tarixi rahat dəyişə bilərsiniz, amma sualı silmək,
            növünü və ya variantların adını dəyişmək mövcud cavabların analitikasına təsir edəcək. Əlavə etdiyiniz yeni suallar
            yalnız bundan sonra cavab verənlərə görünəcək.
          </span>
        </p>
      )}
      {/* 1. Əsas məlumat */}
      <Section title="Əsas məlumat">
        <label className="block">
          <span className="text-sm font-medium">Sorğunun adı</span>
          <input value={s.title} onChange={(e) => patch({ title: e.target.value })} className={`${inputCls} mt-1.5 h-12`} placeholder="Məs.: Platformanın funksionallıqları" />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium">Qısa açıqlama</span>
          <textarea value={s.description} onChange={(e) => patch({ description: e.target.value })} rows={3} className={`${inputCls} mt-1.5 resize-none py-3`} placeholder="İştirakçılara sorğunun məqsədini izah edin" />
        </label>
      </Section>

      {/* 2. Suallar */}
      <Section title={`Suallar (${s.questions.length})`} hint={s.questions.length ? `Təxminən ${estimateMinutes(s)} dəqiqə` : undefined}>
        <ol className="space-y-4">
          {s.questions.map((q, i) => (
            <li key={q.id} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-brand-700">Sual {i + 1}</span>
                <div className="flex gap-1">
                  <IconButton label="Yuxarı" onClick={() => moveQ(i, -1)} disabled={i === 0}><span className="rotate-90"><Icon name="chevron-left" className="size-4" /></span></IconButton>
                  <IconButton label="Aşağı" onClick={() => moveQ(i, 1)} disabled={i === s.questions.length - 1}><span className="-rotate-90"><Icon name="chevron-left" className="size-4" /></span></IconButton>
                  <IconButton label="Sualı sil" onClick={() => removeQ(i)} danger><Icon name="x" className="size-4" /></IconButton>
                </div>
              </div>

              <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => changeType(i, t.type)}
                    className={`h-9 shrink-0 rounded-full px-3 text-sm font-medium transition ${q.type === t.type ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-line"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <input value={q.title} onChange={(e) => patchQ(i, { title: e.target.value })} placeholder="Sualın mətni" className={`${inputCls} mt-3 h-12`} />

              {(q.type === "single" || q.type === "multiple") && (
                <div className="mt-3 space-y-2">
                  {(q.options ?? []).map((opt, k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className={`size-5 shrink-0 border-2 border-slate-300 ${q.type === "single" ? "rounded-full" : "rounded-md"}`} />
                      <input
                        value={opt}
                        onChange={(e) => patchQ(i, { options: q.options!.map((o, m) => (m === k ? e.target.value : o)) })}
                        placeholder={`Variant ${k + 1}`}
                        className={`${inputCls} h-11`}
                      />
                      <IconButton label="Variantı sil" onClick={() => patchQ(i, { options: q.options!.filter((_, m) => m !== k) })} disabled={(q.options?.length ?? 0) <= 2}>
                        <Icon name="x" className="size-4" />
                      </IconButton>
                    </div>
                  ))}
                  <button type="button" onClick={() => patchQ(i, { options: [...(q.options ?? []), ""] })} className="inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-brand-700">
                    <Icon name="plus" className="size-4" /> Variant əlavə et
                  </button>
                </div>
              )}

              {q.type === "scale" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm">
                    <span className="text-muted">Şkala</span>
                    <select value={q.scaleMax ?? 5} onChange={(e) => patchQ(i, { scaleMax: Number(e.target.value) })} className={`${inputCls} mt-1 h-11`}>
                      {[3, 4, 5, 7, 10].map((n) => <option key={n} value={n}>1 – {n}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted">Minimum etiketi</span>
                    <input value={q.scaleMinLabel ?? ""} onChange={(e) => patchQ(i, { scaleMinLabel: e.target.value })} placeholder="Zəif" className={`${inputCls} mt-1 h-11`} />
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted">Maksimum etiketi</span>
                    <input value={q.scaleMaxLabel ?? ""} onChange={(e) => patchQ(i, { scaleMaxLabel: e.target.value })} placeholder="Əla" className={`${inputCls} mt-1 h-11`} />
                  </label>
                </div>
              )}

              <label className="mt-3 flex h-10 w-fit cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={q.required} onChange={(e) => patchQ(i, { required: e.target.checked })} className="size-5 accent-brand-700" />
                Məcburi sual
              </label>
            </li>
          ))}
        </ol>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => patch({ questions: [...s.questions, blankQuestion(t.type)] })}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
            >
              <Icon name="plus" className="size-4" /> {t.label}
            </button>
          ))}
        </div>
      </Section>

      {!isTemplate && (
        <>
          {/* 3. Auditoriya */}
          <Section title="Auditoriya" hint={`${audienceSize} istifadəçi`}>
            <div className="grid gap-2 sm:grid-cols-2">
              <RadioCard checked={s.audience.all} onClick={() => patch({ audience: { ...s.audience, all: true } })} title="Bütün istifadəçilər" text="Platformanın bütün üzvləri" />
              <RadioCard checked={!s.audience.all} onClick={() => patch({ audience: { ...s.audience, all: false } })} title="Seçilmiş auditoriya" text="Rol və ya fakültəyə görə" />
            </div>
            {!s.audience.all && (
              <div className="mt-4 space-y-4">
                <fieldset>
                  <legend className="text-sm font-medium">Rollar</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <Chip key={r} active={s.audience.roles.includes(r)} onClick={() => patch({ audience: { ...s.audience, roles: toggle(s.audience.roles, r) } })}>{ROLE_LABELS[r]}</Chip>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-medium">Fakültələr</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {faculties.length === 0 && <p className="text-sm text-muted">Hələ fakültə məlumatı olan istifadəçi yoxdur.</p>}
                    {faculties.map((f) => (
                      <Chip key={f} active={s.audience.faculties.includes(f)} onClick={() => patch({ audience: { ...s.audience, faculties: toggle(s.audience.faculties, f) } })}>{f}</Chip>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
              <Icon name="users" className="size-4 shrink-0" /> Dərc edildikdə sorğu <b>{audienceSize}</b> istifadəçinin dashboard-unda görünəcək.
            </p>
          </Section>

          {/* 4. Vaxt */}
          <Section title="Vaxt">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Başlama</span>
                <input type="datetime-local" value={toLocalInput(s.startsAt)} onChange={(e) => patch({ startsAt: fromLocalInput(e.target.value) })} className={`${inputCls} mt-1.5 h-12`} />
                <span className="mt-1 block text-xs text-muted">Boş qalarsa — dərc edilən kimi başlayır</span>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Son tarix</span>
                <input type="datetime-local" value={toLocalInput(s.endsAt)} onChange={(e) => patch({ endsAt: fromLocalInput(e.target.value) })} className={`${inputCls} mt-1.5 h-12`} />
              </label>
            </div>
          </Section>

          {/* 5. Nəticələr */}
          <Section title="Nəticələrin görünməsi">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={s.resultsVisibility === "RESPONDENTS"}
                onChange={(e) => patch({ resultsVisibility: e.target.checked ? "RESPONDENTS" : "NONE" })}
                className="mt-0.5 size-5 accent-brand-700"
              />
              <span>
                <span className="block text-sm font-medium">Nəticələri iştirakçılara göstər</span>
                <span className="block text-xs text-muted">Cavab verən istifadəçilər ümumiləşdirilmiş nəticələri görə biləcək</span>
              </span>
            </label>
            {s.resultsVisibility === "RESPONDENTS" && (
              <label className="mt-4 block sm:max-w-xs">
                <span className="text-sm font-medium">Nəticələr bu tarixədək açıqdır</span>
                <input type="datetime-local" value={toLocalInput(s.resultsVisibleUntil)} onChange={(e) => patch({ resultsVisibleUntil: fromLocalInput(e.target.value) })} className={`${inputCls} mt-1.5 h-12`} />
              </label>
            )}
          </Section>
        </>
      )}

      {/* Əməliyyatlar — mobil alt naviqasiyanın üstündə yapışqan panel */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-lg lg:bottom-4">
        {errors.length > 0 && (
          <ul role="alert" className="mb-3 space-y-1 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        )}
        <div className="flex gap-2">
          {published ? (
            <button type="button" disabled={pending} onClick={() => submit("publish")} className="h-12 flex-1 rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
              {pending ? "Saxlanılır…" : "Dəyişiklikləri yadda saxla"}
            </button>
          ) : isTemplate ? (
            <button type="button" disabled={pending} onClick={() => submit("template")} className="h-12 flex-1 rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
              {pending ? "Saxlanılır…" : "Şablonu saxla"}
            </button>
          ) : (
            <>
              <button type="button" disabled={pending} onClick={() => submit("draft")} className="h-12 flex-1 rounded-xl bg-white font-semibold ring-1 ring-line hover:bg-slate-50 disabled:opacity-60">
                Draft kimi saxla
              </button>
              <button type="button" disabled={pending} onClick={() => submit("publish")} className="h-12 flex-1 rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
                {pending ? "Gözləyin…" : s.startsAt && Date.parse(s.startsAt) > Date.now() ? "Planlaşdır" : "Dərc et"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Kiçik komponentlər ----------

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-9 place-items-center rounded-lg transition disabled:opacity-30 ${danger ? "text-red-600 hover:bg-red-50" : "text-slate-500 hover:bg-white"}`}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition ${active ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-line hover:bg-slate-50"}`}
    >
      {active && <Icon name="check" className="size-4" />}
      {children}
    </button>
  );
}

function RadioCard({ checked, onClick, title, text }: { checked: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl p-4 text-left transition ${checked ? "bg-brand-50 ring-2 ring-brand-600" : "bg-white ring-1 ring-line hover:ring-brand-200"}`}
    >
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-brand-600" : "border-slate-300"}`}>
        {checked && <span className="size-2.5 rounded-full bg-brand-600" />}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </button>
  );
}
