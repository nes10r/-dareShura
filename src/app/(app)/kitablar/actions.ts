"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission, requireUser } from "@/lib/auth";
import { BOOK_LIMITS, cleanChapters, getBookView, initiatorOf, respondBookRequest, validateBook, type BookFormInput } from "@/lib/books";
import {
  deleteBook,
  deleteBookRequest,
  deleteChapter,
  findUserById,
  getBook,
  getBookRequest,
  insertBook,
  insertBookRequest,
  insertChapter,
  listBookRequests,
  listChapters,
  markBookRequestSeen,
  updateBook,
  updateChapter,
} from "@/lib/db/repo";

export type BookActionResult = { ok?: boolean; error?: string; id?: string };

const done = (id?: string): BookActionResult => {
  revalidatePath("/", "layout");
  return { ok: true, id };
};

async function requireEditor(bookId: string) {
  const user = await requireUser();
  const book = await getBook(bookId);
  if (!book || book.editorId !== user.id) return null;
  return { user, book };
}

export async function createBookAction(input: BookFormInput & { chapters: { title: string; description: string }[] }): Promise<BookActionResult> {
  const user = await requireUser();
  const v = validateBook(input);
  if (!v.ok) return { error: v.error };
  const id = await insertBook(v.value, user.id, cleanChapters(input.chapters));
  return done(id);
}

export async function updateBookAction(id: string, input: BookFormInput): Promise<BookActionResult> {
  if (!(await requireEditor(id))) return { error: "Yalnız redaktor dəyişə bilər." };
  const v = validateBook(input);
  if (!v.ok) return { error: v.error };
  await updateBook(id, v.value);
  return done(id);
}

export async function setBookStatusAction(id: string, status: "open" | "closed") {
  if (!(await requireEditor(id))) return;
  await updateBook(id, { status });
  done();
}

/** Redaktor və ya moderator (admin) silə bilər */
export async function deleteBookAction(id: string) {
  const user = await requireUser();
  const book = await getBook(id);
  if (!book || (book.editorId !== user.id && !hasPermission(user, "news.manage"))) return;
  await deleteBook(id);
  revalidatePath("/", "layout");
  redirect("/kitablar");
}

export async function addChapterAction(bookId: string, title: string, description: string): Promise<BookActionResult> {
  if (!(await requireEditor(bookId))) return { error: "Yalnız redaktor fəsil əlavə edə bilər." };
  const [c] = cleanChapters([{ title, description }]);
  if (!c) return { error: "Fəslin adını yazın." };
  if ((await listChapters([bookId])).length >= BOOK_LIMITS.chapters) return { error: `Ən çox ${BOOK_LIMITS.chapters} fəsil ola bilər.` };
  await insertChapter(bookId, c);
  return done();
}

export async function updateChapterAction(bookId: string, chapterId: string, title: string, description: string): Promise<BookActionResult> {
  if (!(await requireEditor(bookId))) return { error: "Yalnız redaktor dəyişə bilər." };
  const [c] = cleanChapters([{ title, description }]);
  if (!c) return { error: "Fəslin adını yazın." };
  if (!(await listChapters([bookId])).some((x) => x.id === chapterId)) return { error: "Fəsil tapılmadı." };
  await updateChapter(chapterId, c);
  return done();
}

export async function removeChapterAction(bookId: string, chapterId: string) {
  if (!(await requireEditor(bookId))) return;
  if (!(await listChapters([bookId])).some((x) => x.id === chapterId)) return;
  await deleteChapter(chapterId);
  done();
}

/** Redaktor müəllifi fəsildən çıxarır və ya müəllif özü çıxır */
export async function removeAuthorAction(bookId: string, chapterId: string, userId: string) {
  const user = await requireUser();
  const book = await getBook(bookId);
  if (!book || (book.editorId !== user.id && user.id !== userId)) return;
  const chapter = (await listChapters([bookId])).find((c) => c.id === chapterId);
  if (!chapter) return;
  await updateChapter(chapterId, { authorIds: chapter.authorIds.filter((id) => id !== userId) });
  done();
}

interface JoinInput {
  chapterId: string | null;
  proposedTitle: string;
  message: string;
}

async function checkJoin(bookId: string, userId: string, input: JoinInput) {
  const view = await getBookView(bookId);
  if (!view) return { error: "Kitab tapılmadı." };
  if (view.book.status !== "open") return { error: "Bu kitab üçün müəllif qəbulu bağlanıb." };
  if (userId === view.book.editorId) return { error: "Redaktor özü-özünə dəvət göndərə bilməz." };

  const chapter = input.chapterId ? view.chapters.find((c) => c.id === input.chapterId) : null;
  if (input.chapterId && !chapter) return { error: "Fəsil tapılmadı." };
  if (chapter?.authorIds.includes(userId)) return { error: "Bu üzv artıq həmin fəslin müəllifidir." };
  const proposedTitle = chapter ? "" : String(input.proposedTitle ?? "").replace(/\s+/g, " ").trim().slice(0, BOOK_LIMITS.chapterTitle);
  if (!chapter && proposedTitle.length < 3) return { error: "Fəsil seçin və ya yeni fəslin adını yazın." };
  if (view.requests.some((r) => r.userId === userId && r.status === "pending")) return { error: "Bu kitab üzrə cavab gözləyən dəvət/müraciət artıq var." };

  return { view, value: { bookId, chapterId: chapter?.id ?? null, proposedTitle, userId, message: String(input.message ?? "").trim().slice(0, BOOK_LIMITS.message) } };
}

/** Üzv: "Bu fəsli yazmaq istəyirəm" və ya yeni fəsil təklifi */
export async function requestChapterAction(bookId: string, input: JoinInput): Promise<BookActionResult> {
  const user = await requireUser();
  const res = await checkJoin(bookId, user.id, input);
  if ("error" in res) return { error: res.error };
  const mine = await listBookRequests({ userId: user.id });
  if (mine.filter((r) => r.kind === "request" && r.status === "pending").length >= BOOK_LIMITS.pendingPerUser) {
    return { error: `Eyni anda ən çox ${BOOK_LIMITS.pendingPerUser} cavabsız müraciət ola bilər.` };
  }
  await insertBookRequest({ ...res.value, kind: "request" });
  return done();
}

/** Redaktor: müəllifi fəslə (və ya yeni fəsil yazmağa) dəvət edir */
export async function inviteAuthorAction(bookId: string, toUserId: string, input: JoinInput): Promise<BookActionResult> {
  if (!(await requireEditor(bookId))) return { error: "Yalnız redaktor dəvət göndərə bilər." };
  if (!(await findUserById(toUserId))) return { error: "Üzv tapılmadı." };
  const res = await checkJoin(bookId, toUserId, input);
  if ("error" in res) return { error: res.error };
  await insertBookRequest({ ...res.value, kind: "invite" });
  return done();
}

export async function respondBookRequestAction(id: string, accept: boolean) {
  const user = await requireUser();
  await respondBookRequest(id, user.id, accept);
  done();
}

/** Təşəbbüskar cavab gözləyən dəvət/müraciəti geri götürür */
export async function cancelBookRequestAction(id: string) {
  const user = await requireUser();
  const r = await getBookRequest(id);
  const book = r && (await getBook(r.bookId));
  if (!r || !book || initiatorOf(r, book) !== user.id) return;
  await deleteBookRequest(id);
  done();
}

/** "Gördüm": qəbul bildirişi dashboard-dan gizlənir */
export async function dismissBookRequestAction(id: string) {
  const user = await requireUser();
  const r = await getBookRequest(id);
  const book = r && (await getBook(r.bookId));
  if (!r || !book || initiatorOf(r, book) !== user.id) return;
  await markBookRequestSeen(id);
  done();
}
