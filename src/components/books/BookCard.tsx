import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { avatarUrl, formatDate } from "@/lib/format";
import { BOOK_KINDS, type BookChapter, type BookProject, type User } from "@/lib/types";

export function daysUntil(iso: string | null, now = Date.now()) {
  return iso ? Math.ceil((Date.parse(iso) - now) / 86_400_000) : null;
}

export function DeadlineChip({ deadline }: { deadline: string | null }) {
  if (!deadline) return null;
  const d = daysUntil(deadline)!;
  const cls = d < 0 ? "bg-slate-100 text-slate-500" : d <= 14 ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      Son tarix: {formatDate(deadline)}
      {d >= 0 && <span className="ml-1 font-semibold">· {d === 0 ? "bu gün" : `${d} gün`}</span>}
    </span>
  );
}

/** Siyahı kartı: növ, ad, redaktor, sahələr (uyğunlar vurğulanır), fəsillərin dolma vəziyyəti */
export function BookCard({
  book,
  chapters,
  editor,
  matched = [],
  role,
}: {
  book: BookProject;
  chapters: BookChapter[];
  editor?: Pick<User, "id" | "name" | "avatarUpdatedAt">;
  matched?: string[];
  role?: "editor" | "author";
}) {
  const filled = chapters.filter((c) => c.authorIds.length).length;
  const hit = new Set(matched.map((m) => m.toLocaleLowerCase("az")));
  return (
    <Link
      href={`/kitablar/${book.id}`}
      className="group flex h-full flex-col rounded-2xl bg-white p-4 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-violet-200 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
        <span className="text-violet-700">{BOOK_KINDS[book.kind].label}</span>
        {book.status === "closed" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Bağlanıb</span>}
        {role && <span className="rounded-full bg-violet-700 px-2 py-0.5 text-white">{role === "editor" ? "Redaktor" : "Müəllif"}</span>}
      </div>
      <h3 className="mt-1.5 text-[17px] font-semibold leading-snug group-hover:text-violet-800">{book.title}</h3>
      {editor && (
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
          <Avatar name={editor.name} src={avatarUrl(editor)} size="xs" /> <span className="truncate">{editor.name}</span>
        </p>
      )}
      {book.topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {book.topics.map((t) => (
            <span key={t} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${hit.has(t.toLocaleLowerCase("az")) ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-700"}`}>
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto pt-4">
        {chapters.length > 0 ? (
          <>
            <div className="flex items-baseline justify-between text-xs text-muted">
              <span>
                Fəsillər: <b className="text-ink">{filled}</b>/{chapters.length} müəllifli
              </span>
              {chapters.length - filled > 0 && book.status === "open" && <span className="font-semibold text-emerald-700">{chapters.length - filled} boş</span>}
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-violet-600" style={{ width: `${(filled / chapters.length) * 100}%` }} />
            </div>
          </>
        ) : (
          <p className="text-xs text-muted">Fəsil planı hələ yoxdur — mövzu təklif edə bilərsiniz</p>
        )}
        {book.deadline && (
          <div className="mt-2.5">
            <DeadlineChip deadline={book.deadline} />
          </div>
        )}
      </div>
    </Link>
  );
}
