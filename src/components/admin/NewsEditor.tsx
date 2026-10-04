"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveNews, type NewsInput } from "@/app/(app)/admin/news/actions";
import { Icon } from "@/components/Icon";
import { fromLocalInput, toLocalInput } from "@/lib/datetime";
import { CATEGORY_FIELDS, CATEGORY_TEMPLATES, EVENT_FORMATS, META_LABELS, htmlToText } from "@/lib/news-content";
import { NEWS_CATEGORIES, NEWS_COVER_PRESETS, type NewsMeta } from "@/lib/types";
import { RichTextEditor } from "./RichTextEditor";

const inputCls =
  "w-full rounded-xl border border-line bg-white px-3.5 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

const CATEGORY_HINTS: Record<string, string> = {
  Xəbər: "Fəaliyyətlə bağlı ümumi məlumat",
  Elan: "Son tarixi olan müraciət, müsabiqə və s.",
  İclas: "Şura iclası: tarix, məkan, gündəlik",
  Tədbir: "Konfrans, seminar: proqram, qeydiyyat",
};

type Draft = Omit<NewsInput, "publish">;

export function NewsEditor({ id, initial, published }: { id: string | null; initial: Draft; published: boolean }) {
  const router = useRouter();
  const [n, setN] = useState<Draft>(initial);
  const isPreset = !n.coverImage || NEWS_COVER_PRESETS.some((p) => p.src === n.coverImage);
  const [customUrl, setCustomUrl] = useState(isPreset ? "" : (n.coverImage ?? ""));
  const [resetKey, setResetKey] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const patch = (p: Partial<Draft>) => {
    setN((prev) => ({ ...prev, ...p }));
    setSaved(false);
  };
  const patchMeta = (p: Partial<NewsMeta>) => patch({ meta: { ...n.meta, ...p } });

  const fields = CATEGORY_FIELDS[n.category];
  const template = CATEGORY_TEMPLATES[n.category];

  function applyTemplate() {
    if (!template) return;
    if (htmlToText(n.body) && !window.confirm("Mövcud mətn şablonla əvəz olunsun?")) return;
    patch({ body: template });
    setResetKey((k) => k + 1);
  }

  function submit(publish: boolean) {
    setErrors([]);
    startTransition(async () => {
      const res = await saveNews(id, { ...n, publish });
      if (!res.ok) return setErrors(res.errors);
      if (!id) router.replace(`/admin/news/${res.id}?saved=1`);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  const dateField = (key: "startsAt" | "endsAt" | "deadline") => (
    <label key={key} className="block">
      <span className="text-sm font-medium">{META_LABELS[key]}</span>
      <input
        type="datetime-local"
        value={toLocalInput(n.meta[key])}
        onChange={(e) => patchMeta({ [key]: fromLocalInput(e.target.value) ?? undefined })}
        className={`${inputCls} mt-1.5 h-12`}
      />
    </label>
  );

  const textField = (key: "location" | "contact" | "onlineUrl" | "registrationUrl", placeholder: string, url = false) => (
    <label key={key} className="block">
      <span className="text-sm font-medium">{META_LABELS[key]}</span>
      <input
        value={n.meta[key] ?? ""}
        onChange={(e) => patchMeta({ [key]: e.target.value || undefined })}
        inputMode={url ? "url" : undefined}
        placeholder={placeholder}
        className={`${inputCls} mt-1.5 h-12`}
      />
    </label>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
        <label className="block">
          <span className="text-sm font-medium">Başlıq</span>
          <input value={n.title} onChange={(e) => patch({ title: e.target.value })} className={`${inputCls} mt-1.5 h-12`} placeholder="Xəbərin başlığı" />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Kateqoriya</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {NEWS_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={n.category === c}
                onClick={() => patch({ category: c })}
                className={`h-10 rounded-full px-4 text-sm font-medium transition ${n.category === c ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-line hover:bg-slate-50"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{CATEGORY_HINTS[n.category]}</p>
        </fieldset>

        <label className="mt-4 block">
          <span className="text-sm font-medium">Qısa məzmun</span>
          <textarea value={n.summary} onChange={(e) => patch({ summary: e.target.value })} rows={2} className={`${inputCls} mt-1.5 resize-none py-3`} placeholder="Kartlarda göstəriləcək 1–2 cümlə" />
        </label>
      </section>

      {/* Kateqoriyaya xas sahələr */}
      {fields.length > 0 && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Icon name={n.category === "Elan" ? "megaphone" : "calendar"} className="size-5 text-brand-700" />
            {n.category} məlumatları
          </h2>
          <p className="mt-1 text-xs text-muted">Xəbər səhifəsində ayrıca məlumat kartı kimi göstərilir. Hamısı istəyə bağlıdır.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {fields.includes("startsAt") && dateField("startsAt")}
            {fields.includes("endsAt") && dateField("endsAt")}
            {fields.includes("deadline") && dateField("deadline")}
            {fields.includes("location") && textField("location", "Məs.: Əsas bina, 3-cü mərtəbə, akt zalı")}
            {fields.includes("format") && (
              <fieldset>
                <legend className="text-sm font-medium">{META_LABELS.format}</legend>
                <div className="mt-1.5 flex gap-2">
                  {EVENT_FORMATS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={n.meta.format === f}
                      onClick={() => patchMeta({ format: n.meta.format === f ? undefined : f })}
                      className={`h-12 flex-1 rounded-xl text-sm font-medium transition ${n.meta.format === f ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-line hover:bg-slate-50"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {fields.includes("contact") && textField("contact", "Məs.: elmi katib, daxili 1234")}
            {fields.includes("registrationUrl") && textField("registrationUrl", "https://...", true)}
            {fields.includes("onlineUrl") && (n.meta.format !== "Əyani" || n.category === "Tədbir") && textField("onlineUrl", "https://... (Zoom, Teams və s.)", true)}
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Mətn</h2>
          {template && (
            <button
              type="button"
              onClick={applyTemplate}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-50 px-3 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              <Icon name="template" className="size-4" /> {n.category} şablonu
            </button>
          )}
        </div>
        <RichTextEditor value={n.body} onChange={(body) => patch({ body })} resetKey={resetKey} />
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
        <h2 className="font-semibold">Şəkil</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          <button
            type="button"
            onClick={() => { patch({ coverImage: null }); setCustomUrl(""); }}
            className={`grid aspect-[4/3] place-items-center rounded-xl text-xs font-medium text-muted transition ${!n.coverImage ? "ring-2 ring-brand-600" : "ring-1 ring-line hover:ring-brand-200"}`}
          >
            Şəkilsiz
          </button>
          {NEWS_COVER_PRESETS.map((p) => (
            <button
              key={p.src}
              type="button"
              onClick={() => { patch({ coverImage: p.src }); setCustomUrl(""); }}
              aria-label={p.label}
              className={`relative aspect-[4/3] overflow-hidden rounded-xl transition ${n.coverImage === p.src ? "ring-2 ring-brand-600 ring-offset-2" : "ring-1 ring-line hover:opacity-90"}`}
            >
              <Image src={p.src} alt="" fill sizes="160px" className="object-cover" />
              {n.coverImage === p.src && (
                <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-brand-600 text-white"><Icon name="check" className="size-4" /></span>
              )}
            </button>
          ))}
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium">və ya şəkil linki</span>
          <input
            value={customUrl}
            onChange={(e) => { setCustomUrl(e.target.value); patch({ coverImage: e.target.value || null }); }}
            inputMode="url"
            placeholder="https://..."
            className={`${inputCls} mt-1.5 h-12`}
          />
        </label>
      </section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-lg lg:bottom-4">
        {errors.length > 0 && (
          <ul role="alert" className="mb-3 space-y-1 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        )}
        {saved && <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">Yadda saxlanıldı.</p>}
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => submit(false)} className="h-12 flex-1 rounded-xl bg-white font-semibold ring-1 ring-line hover:bg-slate-50 disabled:opacity-60">
            {published ? "Dərcdən çıxar" : "Qaralama"}
          </button>
          <button type="button" disabled={pending} onClick={() => submit(true)} className="h-12 flex-1 rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
            {pending ? "Gözləyin…" : published ? "Yenilə" : "Dərc et"}
          </button>
        </div>
      </div>
    </div>
  );
}
