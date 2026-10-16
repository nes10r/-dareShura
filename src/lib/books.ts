import {
  getBook,
  getBookRequest,
  insertChapter,
  listBookRequests,
  listBooks,
  listChapters,
  listUsers,
  setBookRequestStatus,
  updateChapter,
  type BookInput,
} from "./db/repo";
import type { BookRequestCardData } from "./modules/types";
import { normalizeSkills } from "./skills";
import { BOOK_KINDS, type BookChapter, type BookKind, type BookProject, type BookRequest } from "./types";

/**
 * Kitab layihələri: üzv kitab təklifi (proposal) hazırlayır və redaktor olur.
 * Digər üzvlər fəsil yazmaq üçün müraciət edir və ya redaktor onları dəvət edir;
 * qəbul olunduqda müəllif fəslə əlavə edilir (fəsil yoxdursa — təklif olunan adla yaradılır).
 */

export const BOOK_LIMITS = { title: 160, description: 3000, chapterTitle: 160, chapterDescription: 400, chapters: 40, message: 600, pendingPerUser: 10 };

export interface BookFormInput {
  title: string;
  kind: string;
  description: string;
  topics: string[];
  language: string;
  publisher: string;
  /** YYYY-MM-DD */
  deadline: string;
}

const clean = (s: unknown, max: number) => String(s ?? "").replace(/[ \t]+/g, " ").trim().slice(0, max);

export function validateBook(raw: BookFormInput): { ok: true; value: BookInput } | { ok: false; error: string } {
  const title = clean(raw.title, BOOK_LIMITS.title).replace(/\s+/g, " ");
  if (title.length < 3) return { ok: false, error: "Kitabın adını yazın." };
  const kind = (raw.kind in BOOK_KINDS ? raw.kind : "other") as BookKind;
  const description = String(raw.description ?? "").trim().slice(0, BOOK_LIMITS.description);
  if (description.length < 30) return { ok: false, error: "Kitabın məqsədini və əhatə dairəsini ən azı bir-iki cümlə ilə təsvir edin." };
  let deadline: string | null = null;
  if (raw.deadline) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.deadline)) return { ok: false, error: "Son tarix yanlışdır." };
    deadline = new Date(`${raw.deadline}T23:59:00+04:00`).toISOString();
  }
  return {
    ok: true,
    value: {
      title,
      kind,
      description,
      topics: normalizeSkills(Array.isArray(raw.topics) ? raw.topics.map(String) : []),
      language: clean(raw.language, 60),
      publisher: clean(raw.publisher, 160),
      deadline,
    },
  };
}

export function cleanChapters(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => ({ title: clean(c?.title, BOOK_LIMITS.chapterTitle).replace(/\s+/g, " "), description: clean(c?.description, BOOK_LIMITS.chapterDescription) }))
    .filter((c) => c.title.length >= 2)
    .slice(0, BOOK_LIMITS.chapters);
}

export interface BookView {
  book: BookProject;
  chapters: BookChapter[];
  requests: BookRequest[];
  /** Redaktor + bütün fəsil müəllifləri */
  team: string[];
}

export function teamOf(book: BookProject, chapters: BookChapter[]) {
  return [...new Set([book.editorId, ...chapters.flatMap((c) => c.authorIds)])];
}

export async function getBookView(id: string): Promise<BookView | null> {
  const book = await getBook(id);
  if (!book) return null;
  const [chapters, requests] = await Promise.all([listChapters([id]), listBookRequests({ bookIds: [id] })]);
  return { book, chapters, requests, team: teamOf(book, chapters) };
}

/** Dəvət/müraciətə kim cavab verir: dəvətdə — dəvət olunan, müraciətdə — redaktor */
export const responderOf = (r: BookRequest, book: BookProject) => (r.kind === "invite" ? r.userId : book.editorId);
/** Təşəbbüskar: dəvətdə — redaktor, müraciətdə — üzv */
export const initiatorOf = (r: BookRequest, book: BookProject) => (r.kind === "invite" ? book.editorId : r.userId);

export type Result = { ok: true } | { ok: false; error: string };

/** Qəbul: müəllif fəslə əlavə olunur; fəsil göstərilməyibsə və ya silinibsə — təklif olunan adla yeni fəsil */
export async function respondBookRequest(id: string, userId: string, accept: boolean): Promise<Result> {
  const r = await getBookRequest(id);
  const book = r && (await getBook(r.bookId));
  if (!r || !book) return { ok: false, error: "Təklif tapılmadı." };
  if (responderOf(r, book) !== userId) return { ok: false, error: "Bu təklifə cavab vermək hüququnuz yoxdur." };
  if (accept && book.status !== "open") return { ok: false, error: "Bu kitab üçün müəllif qəbulu bağlanıb." };
  if (!(await setBookRequestStatus(id, accept ? "accepted" : "declined"))) return { ok: false, error: "Bu təklifə artıq cavab verilib." };
  if (!accept) return { ok: true };

  const chapter = r.chapterId ? (await listChapters([book.id])).find((c) => c.id === r.chapterId) : undefined;
  if (chapter) {
    if (!chapter.authorIds.includes(r.userId)) await updateChapter(chapter.id, { authorIds: [...chapter.authorIds, r.userId] });
  } else {
    await insertChapter(book.id, { title: r.proposedTitle || "Yeni fəsil", description: "", authorIds: [r.userId] });
  }
  return { ok: true };
}

export function chapterLabel(r: Pick<BookRequest, "chapterId" | "proposedTitle">, chapters: BookChapter[]) {
  const c = r.chapterId ? chapters.find((x) => x.id === r.chapterId) : undefined;
  return c ? `${c.position}. ${c.title}` : r.proposedTitle ? `Yeni fəsil: ${r.proposedTitle}` : "Fəsil";
}

export interface UserBookRequests {
  /** Mənim cavab verməli olduğum (dəvət mənə / müraciət kitabıma) */
  pending: BookRequestCardData[];
  /** Təşəbbüs mənim idi, qəbul olundu, hələ görməmişəm */
  accepted: BookRequestCardData[];
  /** Təşəbbüs mənim idi, cavab gözləyir və ya imtina olunub */
  outgoing: BookRequestCardData[];
}

/** İstifadəçiyə aid bütün kitab dəvət/müraciətləri — dashboard kartları və /kitablar üçün */
export async function getUserBookRequests(userId: string, books?: BookProject[]): Promise<UserBookRequests> {
  const allBooks = books ?? (await listBooks());
  const edited = allBooks.filter((b) => b.editorId === userId).map((b) => b.id);
  const [mine, toMyBooks] = await Promise.all([listBookRequests({ userId }), listBookRequests({ bookIds: edited })]);
  const all = [...new Map([...mine, ...toMyBooks].map((r) => [r.id, r])).values()];
  const out: UserBookRequests = { pending: [], accepted: [], outgoing: [] };
  if (!all.length) return out;

  const byBook = new Map(allBooks.map((b) => [b.id, b]));
  const chapters = await listChapters([...new Set(all.map((r) => r.bookId))]);
  const people = new Map((await listUsers()).map((u) => [u.id, u]));

  for (const r of all) {
    const book = byBook.get(r.bookId);
    if (!book) continue;
    const responder = responderOf(r, book);
    const initiator = initiatorOf(r, book);
    const otherId = responder === userId ? initiator : responder;
    const o = people.get(otherId);
    if (!o) continue;
    const data: BookRequestCardData = {
      request: r,
      bookId: book.id,
      bookTitle: book.title,
      chapter: chapterLabel(r, chapters),
      other: { id: o.id, name: o.name, email: o.email, position: o.position, avatarUpdatedAt: o.avatarUpdatedAt },
    };
    if (r.status === "pending" && responder === userId && book.status === "open") out.pending.push(data);
    else if (initiator === userId && r.status === "accepted" && !r.initiatorSeenAt) out.accepted.push(data);
    else if (initiator === userId && r.status !== "accepted") out.outgoing.push(data);
  }
  return out;
}
