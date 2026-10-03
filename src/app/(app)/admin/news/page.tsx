import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CategoryChip } from "@/components/news/NewsCard";
import { NewsCover } from "@/components/news/NewsCover";
import { requirePermission } from "@/lib/auth";
import { listAllNews } from "@/lib/db/repo";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Xəbərlərin idarə edilməsi" };

export default async function AdminNewsPage() {
  await requirePermission("news.manage");
  const items = await listAllNews();

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xəbərlər</h1>
          <p className="mt-1 text-muted">Landing səhifəsində dərc olunan xəbər və elanlar</p>
        </div>
        <Link href="/admin/news/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
          <Icon name="plus" className="size-4" /> Yeni xəbər
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-medium">Hələ xəbər yoxdur</p>
          <Link href="/admin/news/new" className="mt-3 inline-flex h-10 items-center gap-1 text-sm font-semibold text-brand-700">
            <Icon name="plus" className="size-4" /> İlk xəbəri yaz
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={`/admin/news/${n.id}`} className="flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-line transition hover:ring-brand-200">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-24">
                  <NewsCover src={n.coverImage} alt="" sizes="96px" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <CategoryChip category={n.category} />
                    {n.isPublished ? (
                      <span>{formatDate(n.publishedAt)}</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">Qaralama</span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-semibold">{n.title}</p>
                </div>
                <Icon name="chevron-right" className="size-5 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
