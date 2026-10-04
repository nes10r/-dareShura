import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { NewsEditor } from "@/components/admin/NewsEditor";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";
import { getNews } from "@/lib/db/repo";
import { bodyToHtml } from "@/lib/news-content";
import { removeNews } from "../actions";

export default async function EditNewsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requirePermission("news.manage");
  const { id } = await params;
  const { saved } = await searchParams;
  const item = await getNews(id);
  if (!item) notFound();

  const btn = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50";

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/admin/news" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Xəbərlər
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Xəbəri redaktə et</h1>
      {saved && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Yadda saxlanıldı.</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {item.isPublished && (
          <Link href={`/xeberler/${item.slug}`} target="_blank" className={btn}>
            <Icon name="arrow-right" className="size-4" /> Saytda bax
          </Link>
        )}
        <form action={removeNews.bind(null, item.id)}>
          <ConfirmSubmit message="Xəbər silinsin? Bu əməliyyat geri qaytarılmır." className={`${btn} text-red-600`}>
            <Icon name="x" className="size-4" /> Sil
          </ConfirmSubmit>
        </form>
      </div>

      <div className="mt-6">
        <NewsEditor
          id={item.id}
          published={item.isPublished}
          initial={{ title: item.title, summary: item.summary, body: bodyToHtml(item.body), category: item.category, coverImage: item.coverImage, meta: item.meta }}
        />
      </div>
    </div>
  );
}
