import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteBookAction, removeAuthorAction, removeChapterAction, setBookStatusAction } from "@/app/(app)/kitablar/actions";
import { DeadlineChip } from "@/components/books/BookCard";
import { BookJoinButton, type ChapterOption, type PersonOption } from "@/components/books/BookJoinButton";
import { BookOutgoingRow, BookPendingCard } from "@/components/books/BookRequestCards";
import { AddChapterForm, ConfirmButton } from "@/components/books/EditorControls";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { hasPermission, requireUser } from "@/lib/auth";
import { getBookView, getUserBookRequests } from "@/lib/books";
import { getBook, listUsers } from "@/lib/db/repo";
import { avatarUrl } from "@/lib/format";
import { matchSkills } from "@/lib/skills";
import { BOOK_KINDS } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const b = await getBook((await params).id);
  return b ? { title: b.title } : {};
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const view = await getBookView(id);
  if (!view) notFound();
  const { book, chapters, requests, team } = view;
  const [users, myReqs] = await Promise.all([listUsers(), getUserBookRequests(me.id)]);
  const byId = new Map(users.map((u) => [u.id, u]));
  const editor = byId.get(book.editorId);

  const isEditor = me.id === book.editorId;
  const inTeam = team.includes(me.id);
  const open = book.status === "open";
  const forThisBook = (list: typeof myReqs.pending) => list.filter((d) => d.bookId === book.id);
  const pendingForMe = forThisBook(myReqs.pending);
  const outgoing = forThisBook(myReqs.outgoing).filter((d) => d.request.status === "pending");
  const myPending = requests.find((r) => r.userId === me.id && r.status === "pending");

  const chapterOptions: ChapterOption[] = chapters.map((c) => ({ id: c.id, position: c.position, title: c.title, authors: c.authorIds.length }));
  const busyIds = new Set(requests.filter((r) => r.status === "pending").map((r) => r.userId));
  const people: PersonOption[] = isEditor
    ? users
        .filter((u) => u.id !== me.id)
        .map((u) => ({
          id: u.id,
          name: u.name,
          position: u.position,
          avatar: avatarUrl(u),
          matched: matchSkills(u.skills ?? [], book.topics),
          busy: busyIds.has(u.id) ? "Dəvət/müraciət cavab gözləyir" : undefined,
        }))
    : [];
  const pendingByChapter = (chId: string) => requests.filter((r) => r.chapterId === chId && r.status === "pending").length;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/kitablar" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Kitablar
      </Link>

      {/* Başlıq */}
      <section className="mt-2 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
          <span className="text-violet-700">{BOOK_KINDS[book.kind].label}</span>
          {!open && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Müəllif qəbulu bağlanıb</span>}
        </div>
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight">{book.title}</h1>
        {editor && (
          <Link href={`/tedqiqatcilar/${editor.id}`} className="mt-3 inline-flex items-center gap-2.5 rounded-xl py-1 pr-2 hover:bg-slate-50">
            <Avatar name={editor.name} src={avatarUrl(editor)} size="md" />
            <span>
              <span className="block text-sm font-semibold">{editor.name}</span>
              <span className="block text-xs text-muted">Redaktor{isEditor ? " (siz)" : ""}</span>
            </span>
          </Link>
        )}
        {book.topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {book.topics.map((t) => (
              <span key={t} className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-800">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {book.language && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">{book.language}</span>}
          {book.publisher && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">Nəşriyyat: {book.publisher}</span>}
          <DeadlineChip deadline={book.deadline} />
        </div>

        {/* Əsas əməliyyat */}
        <div className="mt-5 space-y-2">
          {isEditor ? (
            <>
              {open && <BookJoinButton bookId={book.id} bookTitle={book.title} mode="invite" chapters={chapterOptions} people={people} />}
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/kitablar/${book.id}/redakte`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold ring-1 ring-line hover:bg-slate-50">
                  <Icon name="settings" className="size-4" /> Redaktə et
                </Link>
                <form action={setBookStatusAction.bind(null, book.id, open ? "closed" : "open")} className="grid">
                  <button type="submit" className="h-11 rounded-xl bg-white text-sm font-semibold ring-1 ring-line hover:bg-slate-50">
                    {open ? "Müəllif qəbulunu bağla" : "Yenidən aç"}
                  </button>
                </form>
              </div>
            </>
          ) : pendingForMe.length ? (
            pendingForMe.map((d) => <BookPendingCard key={d.request.id} data={d} />)
          ) : myPending ? (
            <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">Müraciətiniz redaktorun cavabını gözləyir</p>
          ) : open ? (
            <BookJoinButton bookId={book.id} bookTitle={book.title} mode="request" chapters={chapterOptions} label={inTeam ? "Daha bir fəsil yazmaq istəyirəm" : undefined} variant={inTeam ? "secondary" : "primary"} />
          ) : null}
        </div>
      </section>

      {/* Redaktor: gələn müraciətlər və göndərilmiş dəvətlər */}
      {isEditor && pendingForMe.length > 0 && (
        <section className="mt-4 space-y-3" aria-labelledby="requests">
          <h2 id="requests" className="text-sm font-semibold uppercase tracking-wider text-muted">
            Müraciətlər · {pendingForMe.length}
          </h2>
          {pendingForMe.map((d) => (
            <BookPendingCard key={d.request.id} data={d} />
          ))}
        </section>
      )}
      {outgoing.length > 0 && (
        <section className="mt-4 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{isEditor ? "Göndərilmiş dəvətlər" : "Müraciətim"}</h2>
          {outgoing.map((d) => (
            <BookOutgoingRow key={d.request.id} data={d} />
          ))}
        </section>
      )}

      <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Kitab haqqında</h2>
        <p className="whitespace-pre-line leading-relaxed text-slate-700">{book.description}</p>
      </section>

      {/* Fəsillər */}
      <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Fəsillər{chapters.length ? ` · ${chapters.filter((c) => c.authorIds.length).length}/${chapters.length} müəllifli` : ""}
        </h2>
        {chapters.length ? (
          <ol className="mt-2 divide-y divide-line">
            {chapters.map((c) => {
              const authors = c.authorIds.map((a) => byId.get(a)).filter((u) => !!u);
              const waiting = isEditor ? pendingByChapter(c.id) : 0;
              return (
                <li key={c.id} className="flex gap-3 py-3.5">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${authors.length ? "bg-violet-700 text-white" : "bg-violet-50 text-violet-700"}`}>
                    {c.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{c.title}</p>
                    {c.description && <p className="mt-0.5 text-sm text-muted">{c.description}</p>}
                    {authors.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {authors.map((a) => (
                          <li key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-1 text-sm">
                            <Link href={`/tedqiqatcilar/${a.id}`} className="inline-flex items-center gap-1.5 pr-1.5 hover:text-violet-700">
                              <Avatar name={a.name} src={avatarUrl(a)} size="xs" /> {a.name}
                            </Link>
                            {(isEditor || a.id === me.id) && (
                              <form action={removeAuthorAction.bind(null, book.id, c.id, a.id)}>
                                <ConfirmButton
                                  message={a.id === me.id ? "Bu fəslin müəllifləri siyahısından çıxırsınız. Davam edilsin?" : `${a.name} bu fəsildən çıxarılsın?`}
                                  label={a.id === me.id ? "Fəsildən çıx" : "Müəllifi çıxar"}
                                  className="grid size-6 place-items-center rounded-full text-muted hover:bg-white hover:text-red-600"
                                >
                                  <Icon name="x" className="size-3.5" />
                                </ConfirmButton>
                              </form>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">Müəllif axtarılır</p>
                    )}
                    {waiting > 0 && <p className="mt-1.5 text-xs font-medium text-amber-700">{waiting} müraciət/dəvət cavab gözləyir</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {open && isEditor && (
                      <BookJoinButton bookId={book.id} bookTitle={book.title} mode="invite" chapters={chapterOptions} people={people} presetChapterId={c.id} label="Dəvət et" variant="small" />
                    )}
                    {open && !isEditor && !myPending && !pendingForMe.length && !c.authorIds.includes(me.id) && (
                      <BookJoinButton bookId={book.id} bookTitle={book.title} mode="request" chapters={chapterOptions} presetChapterId={c.id} label={authors.length ? "Qoşul" : "Yazım"} variant="small" />
                    )}
                    {isEditor && (
                      <form action={removeChapterAction.bind(null, book.id, c.id)}>
                        <ConfirmButton
                          message={`«${c.title}» fəsli silinsin?${authors.length ? " Müəlliflər də fəsildən çıxarılacaq." : ""}`}
                          label="Fəsli sil"
                          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                        >
                          <Icon name="x" className="size-4" />
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted">{isEditor ? "Fəsil planını əlavə edin ki, üzvlər müraciət edə bilsin." : "Fəsil planı hələ yoxdur — öz fəsil mövzunuzu təklif edə bilərsiniz."}</p>
        )}
        {isEditor && <AddChapterForm bookId={book.id} />}
      </section>

      {/* Komanda: əlaqə məlumatları yalnız komanda üzvlərinə görünür */}
      {inTeam && team.length > 1 && (
        <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-line">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Komanda · {team.length}</h2>
          <p className="mt-0.5 text-xs text-muted">Əlaqə məlumatları yalnız kitabın müəlliflərinə görünür</p>
          <ul className="mt-3 space-y-2">
            {team.map((uid) => {
              const u = byId.get(uid);
              return u ? (
                <li key={uid} className="flex items-center gap-3">
                  <Avatar name={u.name} src={avatarUrl(u)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {u.name} {uid === book.editorId && <span className="text-xs text-violet-700">· redaktor</span>}
                    </p>
                    <a href={`mailto:${u.email}`} className="block truncate text-sm text-brand-700 underline underline-offset-2">
                      {u.email}
                    </a>
                  </div>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      )}

      {(isEditor || hasPermission(me, "news.manage")) && (
        <form action={deleteBookAction.bind(null, book.id)} className="mt-6 text-center">
          <ConfirmButton message="Kitab layihəsi və bütün fəsillər silinsin? Bu əməliyyat geri qaytarılmır." className="h-10 rounded-lg px-4 text-sm font-medium text-red-600 hover:bg-red-50">
            Kitab layihəsini sil
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
