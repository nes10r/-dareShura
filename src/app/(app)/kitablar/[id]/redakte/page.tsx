import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookForm } from "@/components/books/BookForm";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { getBook, listAllSkills } from "@/lib/db/repo";

export const metadata: Metadata = { title: "Kitabı redaktə et" };

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const book = await getBook(id);
  if (!book || book.editorId !== user.id) notFound();
  const suggestions = await listAllSkills();
  const deadline = book.deadline ? new Date(Date.parse(book.deadline) + 4 * 3_600_000).toISOString().slice(0, 10) : "";

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href={`/kitablar/${id}`} className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Kitaba qayıt
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Kitabı redaktə et</h1>
      <p className="mt-1 text-muted">Fəsilləri kitab səhifəsində idarə edin.</p>
      <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
        <BookForm
          bookId={id}
          suggestions={suggestions}
          myTopics={user.skills ?? []}
          initial={{ title: book.title, kind: book.kind, description: book.description, topics: book.topics, language: book.language, publisher: book.publisher, deadline }}
        />
      </div>
    </div>
  );
}
