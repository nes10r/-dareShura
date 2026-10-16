import Link from "next/link";
import { cancelBookRequestAction, dismissBookRequestAction, respondBookRequestAction } from "@/app/(app)/kitablar/actions";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { avatarUrl, formatDate } from "@/lib/format";
import type { BookRequestCardData, BookSuggestCardData } from "@/lib/modules/types";

/**
 * Cavab gözləyən dəvət (mənə) və ya müraciət (redaktoru olduğum kitaba): qəbul / imtina birbaşa kartdan.
 */
export function BookPendingCard({ data }: { data: BookRequestCardData }) {
  const { request: r, other, bookId, bookTitle, chapter } = data;
  const invite = r.kind === "invite";
  return (
    <article className="rounded-2xl bg-white p-4 ring-2 ring-violet-200 sm:p-5">
      <div className="flex items-start gap-3">
        <Link href={`/tedqiqatcilar/${other.id}`} className="shrink-0">
          <Avatar name={other.name} src={avatarUrl(other)} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">{invite ? "Kitaba dəvət" : "Fəsil müraciəti"}</p>
          <p className="mt-0.5 text-[15px] leading-snug">
            <Link href={`/tedqiqatcilar/${other.id}`} className="font-semibold hover:text-violet-700">
              {other.name}
            </Link>{" "}
            {invite ? "sizi kitabında fəsil yazmağa dəvət edir:" : "kitabınızda fəsil yazmaq istəyir:"}{" "}
            <Link href={`/kitablar/${bookId}`} className="font-semibold text-violet-800 hover:underline">
              «{bookTitle}»
            </Link>
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-sm text-violet-900">
            <Icon name="book" className="size-4 shrink-0" /> {chapter}
          </p>
          {r.message && <p className="mt-2 whitespace-pre-line rounded-xl bg-surface px-3.5 py-2.5 text-sm text-slate-700">{r.message}</p>}
          <p className="mt-1.5 text-xs text-muted">{formatDate(r.createdAt)}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <form action={respondBookRequestAction.bind(null, r.id, false)} className="grid">
          <button type="submit" className="h-11 rounded-xl bg-white px-5 font-semibold ring-1 ring-line hover:bg-slate-50">
            İmtina
          </button>
        </form>
        <form action={respondBookRequestAction.bind(null, r.id, true)} className="grid">
          <button type="submit" className="h-11 rounded-xl bg-violet-700 px-5 font-semibold text-white hover:bg-violet-800">
            {invite ? "Qoşuluram" : "Qəbul et"}
          </button>
        </form>
      </div>
    </article>
  );
}

/** Təşəbbüskara bildiriş: dəvətim/müraciətim qəbul olundu */
export function BookAcceptedCard({ data }: { data: BookRequestCardData }) {
  const { request: r, other, bookId, bookTitle, chapter } = data;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-2 ring-violet-200">
      <Avatar name={other.name} src={avatarUrl(other)} size="md" />
      <Link href={`/kitablar/${bookId}`} className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <b>{other.name}</b> {r.kind === "invite" ? "dəvətinizi qəbul etdi" : "müraciətinizi qəbul etdi"} ·{" "}
          <span className="font-semibold text-violet-800">«{bookTitle}»</span>
        </p>
        <p className="truncate text-xs text-muted">{chapter}</p>
      </Link>
      <form action={dismissBookRequestAction.bind(null, r.id)}>
        <button type="submit" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-slate-100" aria-label="Gördüm" title="Gördüm">
          <Icon name="check" className="size-4" />
        </button>
      </form>
    </div>
  );
}

/** Göndərdiyim, cavab gözləyən dəvət/müraciət */
export function BookOutgoingRow({ data }: { data: BookRequestCardData }) {
  const { request: r, other, chapter } = data;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-line">
      <Avatar name={other.name} src={avatarUrl(other)} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <b>{other.name}</b> · {chapter}
        </p>
        <p className="text-xs text-muted">
          {r.status === "declined" ? "İmtina edilib" : r.kind === "invite" ? "Dəvət cavab gözləyir" : "Müraciət cavab gözləyir"}
        </p>
      </div>
      {r.status === "pending" && (
        <form action={cancelBookRequestAction.bind(null, r.id)}>
          <button type="submit" className="h-9 rounded-lg px-3 text-sm font-medium text-muted hover:bg-slate-100 hover:text-ink">
            Geri götür
          </button>
        </form>
      )}
    </div>
  );
}

/** Dashboard: sahəmə uyğun, yeni dərc olunmuş kitab təklifləri */
export function BookSuggestCard({ data }: { data: BookSuggestCardData }) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-violet-50 to-white p-4 ring-1 ring-violet-200 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-violet-700 text-white">
          <Icon name="book" className="size-5" />
        </span>
        <h2 className="font-semibold">Sahənizə uyğun kitab layihələri</h2>
      </div>
      <ul className="mt-3 space-y-2">
        {data.items.map((b) => (
          <li key={b.id}>
            <Link href={`/kitablar/${b.id}`} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-line transition hover:ring-violet-300">
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-snug">{b.title}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {b.editor} · {b.openChapters ? `${b.openChapters} boş fəsil` : "fəsil təklif edə bilərsiniz"} · <span className="text-violet-700">{b.matched.join(", ")}</span>
                </span>
              </span>
              <Icon name="chevron-right" className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
