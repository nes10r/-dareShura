"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveNews, type NewsInput } from "@/app/(app)/admin/news/actions";
import { Icon } from "@/components/Icon";
import { NEWS_CATEGORIES, NEWS_COVER_PRESETS } from "@/lib/types";

const inputCls =
  "w-full rounded-xl border border-line bg-white px-3.5 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export function NewsEditor({ id, initial, published }: { id: string | null; initial: Omit<NewsInput, "publish">; published: boolean }) {
  const router = useRouter();
  const [n, setN] = useState(initial);
  const isPreset = !n.coverImage || NEWS_COVER_PRESETS.some((p) => p.src === n.coverImage);
  const [customUrl, setCustomUrl] = useState(isPreset ? "" : (n.coverImage ?? ""));
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const patch = (p: Partial<typeof n>) => {
    setN((prev) => ({ ...prev, ...p }));
    setSaved(false);
  };

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
        </fieldset>

        <label className="mt-4 block">
          <span className="text-sm font-medium">Qısa məzmun</span>
          <textarea value={n.summary} onChange={(e) => patch({ summary: e.target.value })} rows={2} className={`${inputCls} mt-1.5 resize-none py-3`} placeholder="Kartlarda göstəriləcək 1–2 cümlə" />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium">Mətn</span>
          <textarea value={n.body} onChange={(e) => patch({ body: e.target.value })} rows={10} className={`${inputCls} mt-1.5 py-3`} placeholder="Xəbərin tam mətni" />
          <span className="mt-1 block text-xs text-muted">Abzasları boş sətirlə ayırın.</span>
        </label>
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
