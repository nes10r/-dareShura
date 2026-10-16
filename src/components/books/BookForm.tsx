"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBookAction, updateBookAction } from "@/app/(app)/kitablar/actions";
import { Icon } from "@/components/Icon";
import { TagInput } from "@/components/ui/TagInput";
import { BOOK_KINDS, type BookKind } from "@/lib/types";

const inputCls =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

export interface BookFormInitial {
  title: string;
  kind: BookKind;
  description: string;
  topics: string[];
  language: string;
  publisher: string;
  deadline: string;
}

/**
 * Kitab təklifi (proposal): növ, ad, məqsəd/əhatə, sahələr, dil, nəşriyyat planı, son tarix
 * və (yaradılarkən) planlaşdırılan fəsillər. Fəsillər sonra kitab səhifəsində də idarə olunur.
 */
export function BookForm({ bookId, initial, suggestions, myTopics }: { bookId?: string; initial?: BookFormInitial; suggestions: string[]; myTopics: string[] }) {
  const router = useRouter();
  const [f, setF] = useState<BookFormInitial>(
    initial ?? { title: "", kind: "edited", description: "", topics: myTopics.slice(0, 3), language: "Azərbaycan dili", publisher: "", deadline: "" },
  );
  const [chapters, setChapters] = useState<{ title: string; description: string }[]>([
    { title: "", description: "" },
    { title: "", description: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof BookFormInitial>(k: K, v: BookFormInitial[K]) => setF((p) => ({ ...p, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = bookId ? await updateBookAction(bookId, f) : await createBookAction({ ...f, chapters });
      if (res.error) return setError(res.error);
      router.push(`/kitablar/${res.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium">Kitabın növü</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(Object.keys(BOOK_KINDS) as BookKind[]).map((k) => (
            <label
              key={k}
              className={`flex cursor-pointer items-start gap-3 rounded-xl p-3.5 ring-1 transition ${f.kind === k ? "bg-violet-50 ring-2 ring-violet-400" : "bg-white ring-line hover:bg-slate-50"}`}
            >
              <input type="radio" name="kind" checked={f.kind === k} onChange={() => set("kind", k)} className="mt-0.5 size-4 accent-violet-700" />
              <span>
                <span className="block text-sm font-semibold">{BOOK_KINDS[k].label}</span>
                <span className="block text-xs text-muted">{BOOK_KINDS[k].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium">
        Kitabın adı
        <input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={160} placeholder="Məs.: Rəqəmsal iqtisadiyyat: Azərbaycan təcrübəsi" className={inputCls} required />
      </label>

      <label className="block text-sm font-medium">
        Məqsəd və əhatə dairəsi
        <textarea
          value={f.description}
          onChange={(e) => set("description", e.target.value.slice(0, 3000))}
          rows={6}
          placeholder="Kitab hansı problemi həll edir, kimlər üçündür, fəsillərdən nə gözlənilir (həcm, üslub, metodologiya)…"
          className={`${inputCls} h-auto resize-y py-3`}
          required
        />
        <span className="mt-1 block text-right text-xs font-normal text-muted">{f.description.length}/3000</span>
      </label>

      <div>
        <span className="text-sm font-medium">Elmi sahələr</span>
        <p className="text-xs text-muted">Bu sahələri profilində qeyd edən üzvlərə kitab təklif kimi göstəriləcək.</p>
        <div className="mt-1.5">
          <TagInput value={f.topics} onChange={(t) => set("topics", t)} suggestions={suggestions} placeholder="Məs.: Ekonometrika, Maliyyə" max={8} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Dil
          <input value={f.language} onChange={(e) => set("language", e.target.value)} maxLength={60} placeholder="Azərbaycan dili" className={inputCls} />
        </label>
        <label className="block text-sm font-medium">
          Nəşriyyat (plan)
          <input value={f.publisher} onChange={(e) => set("publisher", e.target.value)} maxLength={160} placeholder="istəyə bağlı" className={inputCls} />
        </label>
        <label className="block text-sm font-medium">
          Fəsillər üçün son tarix
          <input type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} className={inputCls} />
        </label>
      </div>

      {!bookId && (
        <fieldset>
          <legend className="text-sm font-medium">Planlaşdırılan fəsillər</legend>
          <p className="text-xs text-muted">Boş fəsillərə üzvlər müraciət edəcək. Üzvlər öz fəsil mövzularını da təklif edə bilər.</p>
          <ol className="mt-2 space-y-2">
            {chapters.map((c, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl bg-white p-2 ring-1 ring-line">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-sm font-bold text-violet-700">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <input
                    value={c.title}
                    onChange={(e) => setChapters((p) => p.map((x, j) => (j === i ? { ...x, title: e.target.value.slice(0, 160) } : x)))}
                    placeholder="Fəslin adı"
                    aria-label={`${i + 1}-ci fəslin adı`}
                    className="h-10 w-full rounded-lg border border-line px-3 text-base outline-none focus:border-violet-500"
                  />
                  <input
                    value={c.description}
                    onChange={(e) => setChapters((p) => p.map((x, j) => (j === i ? { ...x, description: e.target.value.slice(0, 400) } : x)))}
                    placeholder="Qısa izah (istəyə bağlı)"
                    aria-label={`${i + 1}-ci fəslin izahı`}
                    className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-violet-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setChapters((p) => p.filter((_, j) => j !== i))}
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-slate-100"
                  aria-label={`${i + 1}-ci fəsli sil`}
                >
                  <Icon name="x" className="size-4" />
                </button>
              </li>
            ))}
          </ol>
          {chapters.length < 40 && (
            <button
              type="button"
              onClick={() => setChapters((p) => [...p, { title: "", description: "" }])}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-200 text-sm font-semibold text-violet-700 hover:bg-violet-50"
            >
              <Icon name="plus" className="size-4" /> Fəsil əlavə et
            </button>
          )}
        </fieldset>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-violet-700 font-semibold text-white transition hover:bg-violet-800 disabled:opacity-60 sm:w-auto sm:px-8">
        {pending ? "Saxlanılır…" : bookId ? "Yadda saxla" : "Təklifi dərc et"}
      </button>
    </form>
  );
}
