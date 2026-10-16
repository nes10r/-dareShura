"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { inviteAuthorAction, requestChapterAction } from "@/app/(app)/kitablar/actions";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";

export interface ChapterOption {
  id: string;
  position: number;
  title: string;
  authors: number;
}

export interface PersonOption {
  id: string;
  name: string;
  position: string;
  avatar: string | null;
  matched: string[];
  /** Artıq dəvəti/müraciəti var və ya redaktordur — seçilə bilməz */
  busy?: string;
}

const NEW = "__new";

/**
 * Üzv: "Fəsil yazmaq istəyirəm" (mövcud fəsil və ya öz mövzusu).
 * Redaktor: "Müəllif dəvət et" — əvvəl üzv seçilir (sahəsi uyğun olanlar yuxarıda), sonra fəsil.
 */
export function BookJoinButton({
  bookId,
  bookTitle,
  mode,
  chapters,
  people = [],
  presetChapterId = null,
  label,
  variant = "primary",
}: {
  bookId: string;
  bookTitle: string;
  mode: "request" | "invite";
  chapters: ChapterOption[];
  people?: PersonOption[];
  presetChapterId?: string | null;
  label?: string;
  variant?: "primary" | "secondary" | "small";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chapter, setChapter] = useState<string>(presetChapterId ?? chapters.find((c) => !c.authors)?.id ?? NEW);
  const [proposed, setProposed] = useState("");
  const [message, setMessage] = useState("");
  const [person, setPerson] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setOpen(false), []);

  const list = useMemo(() => {
    const q = query.toLocaleLowerCase("az").trim();
    return people
      .filter((p) => !q || p.name.toLocaleLowerCase("az").includes(q) || p.matched.some((m) => m.toLocaleLowerCase("az").includes(q)))
      .sort((a, b) => Number(!!a.busy) - Number(!!b.busy) || b.matched.length - a.matched.length || a.name.localeCompare(b.name, "az"));
  }, [people, query]);
  const chosen = people.find((p) => p.id === person);

  function send() {
    setError(null);
    const input = { chapterId: chapter === NEW ? null : chapter, proposedTitle: chapter === NEW ? proposed : "", message };
    startTransition(async () => {
      const res = mode === "invite" ? await inviteAuthorAction(bookId, person ?? "", input) : await requestChapterAction(bookId, input);
      if (res.error) return setError(res.error);
      setOpen(false);
      setMessage("");
      setProposed("");
      setPerson(null);
      router.refresh();
    });
  }

  const cls = {
    primary: "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 font-semibold text-white transition hover:bg-violet-800",
    secondary: "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-violet-800 ring-1 ring-violet-200 transition hover:bg-violet-50",
    small: "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50",
  }[variant];

  const step = mode === "invite" && !person ? "person" : "details";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setChapter(presetChapterId ?? chapters.find((c) => !c.authors)?.id ?? NEW);
          setOpen(true);
        }}
        className={cls}
      >
        <Icon name={mode === "invite" ? "users" : "plus"} className={variant === "small" ? "size-4" : "size-5"} />
        {label ?? (mode === "invite" ? "Müəllif dəvət et" : "Fəsil yazmaq istəyirəm")}
      </button>

      <Sheet open={open} onClose={close} title={mode === "invite" ? "Müəllif dəvət et" : "Fəsil yazmaq istəyirəm"} subtitle={bookTitle}>
        {step === "person" ? (
          <div className="mt-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Ad və ya sahə üzrə axtar"
              className="h-12 w-full rounded-xl border border-line px-4 text-base outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
            <ul className="mt-3 max-h-[50dvh] space-y-1 overflow-y-auto">
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={!!p.busy}
                    onClick={() => setPerson(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-violet-50 disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Avatar name={p.name} src={p.avatar} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {p.busy ?? (p.matched.length ? <span className="text-violet-700">✓ {p.matched.join(", ")}</span> : p.position)}
                      </span>
                    </span>
                    {!p.busy && <Icon name="chevron-right" className="size-4 text-muted" />}
                  </button>
                </li>
              ))}
              {!list.length && <li className="py-6 text-center text-sm text-muted">Üzv tapılmadı</li>}
            </ul>
          </div>
        ) : (
          <div className="mt-4">
            {chosen && (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-violet-50 p-2.5">
                <Avatar name={chosen.name} src={chosen.avatar} size="md" />
                <span className="min-w-0 flex-1 truncate font-medium">{chosen.name}</span>
                <button type="button" onClick={() => setPerson(null)} className="h-9 rounded-lg px-3 text-sm font-medium text-violet-700 hover:bg-violet-100">
                  Dəyiş
                </button>
              </div>
            )}

            <p className="text-sm font-medium">Fəsil</p>
            <div className="mt-2 space-y-1.5">
              {chapters.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 ring-1 transition ${chapter === c.id ? "bg-violet-50 ring-2 ring-violet-400" : "ring-line hover:bg-slate-50"}`}
                >
                  <input type="radio" name="chapter" checked={chapter === c.id} onChange={() => setChapter(c.id)} className="size-4 accent-violet-700" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{c.position}.</span> {c.title}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${c.authors ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>
                    {c.authors ? `${c.authors} müəllif` : "boş"}
                  </span>
                </label>
              ))}
              <label className={`block cursor-pointer rounded-xl px-3.5 py-2.5 ring-1 transition ${chapter === NEW ? "bg-violet-50 ring-2 ring-violet-400" : "ring-line hover:bg-slate-50"}`}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="chapter" checked={chapter === NEW} onChange={() => setChapter(NEW)} className="size-4 accent-violet-700" />
                  <span className="text-sm font-semibold">{mode === "invite" ? "Yeni fəsil (mövzu ilə)" : "Öz fəsil mövzumu təklif edirəm"}</span>
                </span>
                {chapter === NEW && (
                  <input
                    value={proposed}
                    onChange={(e) => setProposed(e.target.value.slice(0, 160))}
                    placeholder="Fəslin adı"
                    autoFocus
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none focus:border-violet-500"
                  />
                )}
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium" htmlFor="book-msg">
              Qısa mesaj <span className="font-normal text-muted">(istəyə bağlı)</span>
            </label>
            <textarea
              id="book-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 600))}
              rows={3}
              placeholder={mode === "invite" ? "Niyə məhz bu üzvü dəvət edirsiniz, fəsildən nə gözləyirsiniz…" : "Bu mövzudakı təcrübəniz, fəslin qısa planı…"}
              className="mt-1.5 w-full resize-none rounded-xl border border-line px-4 py-3 text-base outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />

            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={send}
              disabled={pending || (chapter === NEW && proposed.trim().length < 3)}
              className="mt-4 h-12 w-full rounded-xl bg-violet-700 font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50"
            >
              {pending ? "Göndərilir…" : mode === "invite" ? "Dəvəti göndər" : "Müraciəti göndər"}
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
