import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { FeaturedNewsCard, NewsCard } from "@/components/news/NewsCard";
import { getSessionUser } from "@/lib/auth";
import { listPublishedNews } from "@/lib/db/repo";
import { NEWS_CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Xəbərlər və elanlar" };

export default async function NewsListPage({ searchParams }: { searchParams: Promise<{ kateqoriya?: string }> }) {
  const { kateqoriya } = await searchParams;
  const [user, all] = await Promise.all([getSessionUser(), listPublishedNews()]);
  const active = NEWS_CATEGORIES.find((c) => c === kateqoriya) ?? null;
  const items = active ? all.filter((n) => n.category === active) : all;
  const [featured, ...rest] = items;
  const cta = user ? { href: "/dashboard", label: "Kabinet" } : { href: "/login", label: "Daxil ol" };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <SiteHeader cta={cta} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-24 sm:pt-28">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Xəbərlər və elanlar</h1>
        <p className="mt-2 text-muted">Alimlər Şurasının fəaliyyəti ilə bağlı son məlumatlar</p>

        <nav className="-mx-4 mt-6 overflow-x-auto px-4" aria-label="Kateqoriyalar">
          <ul className="flex w-max gap-2">
            {[null, ...NEWS_CATEGORIES].map((c) => (
              <li key={c ?? "all"}>
                <Link
                  href={c ? `/xeberler?kateqoriya=${encodeURIComponent(c)}` : "/xeberler"}
                  aria-current={active === c ? "page" : undefined}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition ${
                    active === c ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-line hover:bg-slate-50"
                  }`}
                >
                  {c ?? "Hamısı"}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {featured ? (
          <>
            <div className="mt-8">
              <FeaturedNewsCard item={featured} />
            </div>
            {rest.length > 0 && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((n) => <NewsCard key={n.id} item={n} />)}
              </div>
            )}
          </>
        ) : (
          <p className="mt-8 rounded-2xl bg-white p-10 text-center text-muted ring-1 ring-line">Bu kateqoriyada hələ xəbər yoxdur.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
