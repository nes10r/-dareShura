import type { Metadata } from "next";
import Link from "next/link";
import { BookCard } from "@/components/books/BookCard";
import { BookAcceptedCard, BookOutgoingRow, BookPendingCard } from "@/components/books/BookRequestCards";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { getUserBookRequests } from "@/lib/books";
import { listBooks, listChapters, listUsers } from "@/lib/db/repo";
import { matchSkills } from "@/lib/skills";

export const metadata: Metadata = { title: "Kitablar" };

export default async function BooksPage() {
  const user = await requireUser();
  const books = await listBooks();
  const [chapters, users, reqs] = await Promise.all([listChapters(books.map((b) => b.id)), listUsers(), getUserBookRequests(user.id, books)]);
  const byId = new Map(users.map((u) => [u.id, u]));
  const chaptersOf = (id: string) => chapters.filter((c) => c.bookId === id);

  const roleOf = (bookId: string, editorId: string) =>
    editorId === user.id ? ("editor" as const) : chaptersOf(bookId).some((c) => c.authorIds.includes(user.id)) ? ("author" as const) : undefined;
  const mine = books.filter((b) => roleOf(b.id, b.editorId));
  const matchedOf = (topics: string[]) => matchSkills(user.skills ?? [], topics);

  const others = books.filter((b) => !roleOf(b.id, b.editorId));
  const open = others
    .filter((b) => b.status === "open")
    .sort((a, b) => matchedOf(b.topics).length - matchedOf(a.topics).length || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const closed = others.filter((b) => b.status === "closed");

  const card = (b: (typeof books)[number]) => (
    <BookCard key={b.id} book={b} chapters={chaptersOf(b.id)} editor={byId.get(b.editorId)} matched={matchedOf(b.topics)} role={roleOf(b.id, b.editorId)} />
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kitab layihələri</h1>
          <p className="mt-1 text-muted">Kollektiv kitab təklif edin, fəsillərə müəllif cəlb edin və ya başqalarının kitabına qoşulun</p>
        </div>
        <Link href="/kitablar/yeni" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 font-semibold text-white hover:bg-violet-800 sm:w-auto">
          <Icon name="plus" className="size-5" /> Kitab təklifi hazırla
        </Link>
      </div>

      {(reqs.pending.length > 0 || reqs.accepted.length > 0) && (
        <section className="mt-6 space-y-3" aria-labelledby="book-pending">
          <h2 id="book-pending" className="text-sm font-semibold uppercase tracking-wider text-muted">
            Cavab gözləyir{reqs.pending.length ? ` · ${reqs.pending.length}` : ""}
          </h2>
          {reqs.pending.map((d) => (
            <BookPendingCard key={d.request.id} data={d} />
          ))}
          {reqs.accepted.map((d) => (
            <BookAcceptedCard key={d.request.id} data={d} />
          ))}
        </section>
      )}

      {mine.length > 0 && (
        <section className="mt-8" aria-labelledby="my-books">
          <h2 id="my-books" className="text-sm font-semibold uppercase tracking-wider text-muted">
            Mənim kitablarım
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{mine.map(card)}</div>
        </section>
      )}

      {reqs.outgoing.length > 0 && (
        <details className="group mt-6">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-muted [&::-webkit-details-marker]:hidden">
            <Icon name="chevron-right" className="size-4 transition group-open:rotate-90" /> Göndərdiyim dəvət və müraciətlər · {reqs.outgoing.length}
          </summary>
          <div className="mt-2 space-y-2">
            {reqs.outgoing.map((d) => (
              <BookOutgoingRow key={d.request.id} data={d} />
            ))}
          </div>
        </details>
      )}

      <section className="mt-8" aria-labelledby="open-books">
        <h2 id="open-books" className="text-sm font-semibold uppercase tracking-wider text-muted">
          Müəllif axtaran kitablar{open.length ? ` · ${open.length}` : ""}
        </h2>
        {open.length ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{open.map(card)}</div>
        ) : (
          <div className="mt-3 rounded-2xl bg-white p-8 text-center ring-1 ring-line">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">
              <Icon name="book" className="size-6" />
            </span>
            <p className="mt-3 font-medium">Hələ açıq kitab layihəsi yoxdur</p>
            <p className="mt-1 text-sm text-muted">İlk təklifi siz hazırlayın — həmkarlarınız fəsil yazmaq üçün qoşulsun.</p>
          </div>
        )}
      </section>

      {closed.length > 0 && (
        <details className="group mt-8">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-muted [&::-webkit-details-marker]:hidden">
            <Icon name="chevron-right" className="size-4 transition group-open:rotate-90" /> Müəllif qəbulu bağlanmış kitablar · {closed.length}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{closed.map(card)}</div>
        </details>
      )}
    </div>
  );
}
