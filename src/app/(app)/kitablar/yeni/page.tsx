import type { Metadata } from "next";
import Link from "next/link";
import { BookForm } from "@/components/books/BookForm";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { listAllSkills } from "@/lib/db/repo";

export const metadata: Metadata = { title: "Kitab təklifi" };

export default async function NewBookPage() {
  const user = await requireUser();
  const suggestions = await listAllSkills();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/kitablar" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Kitablar
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Kitab təklifi hazırla</h1>
      <p className="mt-1 text-muted">Siz redaktor olacaqsınız. Dərc etdikdən sonra üzvlər fəsillərə müraciət edəcək, siz də uyğun müəllifləri dəvət edə biləcəksiniz.</p>
      <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
        <BookForm suggestions={suggestions} myTopics={user.skills ?? []} />
      </div>
    </div>
  );
}
