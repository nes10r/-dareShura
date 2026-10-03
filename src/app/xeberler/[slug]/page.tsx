import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { CategoryChip, NewsCard } from "@/components/news/NewsCard";
import { NewsCover } from "@/components/news/NewsCover";
import { getSessionUser } from "@/lib/auth";
import { getPublishedNewsBySlug, listPublishedNews } from "@/lib/db/repo";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await getPublishedNewsBySlug((await params).slug);
  return item ? { title: item.title, description: item.summary } : {};
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [user, item, latest] = await Promise.all([getSessionUser(), getPublishedNewsBySlug(slug), listPublishedNews(4)]);
  if (!item) notFound();

  const others = latest.filter((n) => n.id !== item.id).slice(0, 3);
  const cta = user ? { href: "/dashboard", label: "Kabinet" } : { href: "/login", label: "Daxil ol" };

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader cta={cta} />
      <main className="flex-1 pb-16 pt-20 sm:pt-24">
        <article className="mx-auto max-w-3xl px-4">
          <Link href="/xeberler" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
            <Icon name="chevron-left" className="size-4" /> Xəbərlər
          </Link>
          <div className="mt-3 flex items-center gap-3 text-sm text-muted">
            <CategoryChip category={item.category} />
            <time dateTime={item.publishedAt ?? undefined}>{formatDate(item.publishedAt)}</time>
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{item.title}</h1>
          {item.summary && <p className="mt-4 text-lg leading-relaxed text-slate-600">{item.summary}</p>}

          {item.coverImage && (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl">
              <NewsCover src={item.coverImage} alt={item.title} sizes="(min-width: 768px) 768px, 100vw" priority />
            </div>
          )}

          <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-slate-700">
            {item.body
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
          </div>
        </article>

        {others.length > 0 && (
          <section className="mx-auto mt-16 max-w-6xl px-4">
            <h2 className="text-xl font-bold">Digər xəbərlər</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((n) => <NewsCard key={n.id} item={n} />)}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
