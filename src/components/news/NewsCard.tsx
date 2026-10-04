import Link from "next/link";
import { Icon } from "@/components/Icon";
import { formatDate, formatShortDateTime } from "@/lib/format";
import type { NewsItem } from "@/lib/types";
import { NewsCover } from "./NewsCover";

const CATEGORY_STYLES: Record<string, string> = {
  Xəbər: "bg-brand-50 text-brand-700",
  Elan: "bg-amber-50 text-amber-800",
  İclas: "bg-emerald-50 text-emerald-700",
  Tədbir: "bg-violet-50 text-violet-700",
};

/** İclas/tədbir vaxtı və ya elanın son tarixi — kartın üzərində kiçik nişan */
function EventBadge({ item }: { item: NewsItem }) {
  const when = item.meta.startsAt ?? item.meta.deadline;
  if (!when) return null;
  return (
    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm backdrop-blur">
      <Icon name={item.meta.startsAt ? "calendar" : "clock"} className="size-3.5 text-brand-700" />
      {item.meta.startsAt ? "" : "Son tarix: "}
      {formatShortDateTime(when)}
    </span>
  );
}

export function CategoryChip({ category, onDark = false }: { category: string; onDark?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        onDark ? "bg-white/15 text-white backdrop-blur" : CATEGORY_STYLES[category] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {category}
    </span>
  );
}

/** Böyük, önə çıxarılmış xəbər kartı */
export function FeaturedNewsCard({ item }: { item: NewsItem }) {
  return (
    <Link
      href={`/xeberler/${item.slug}`}
      className="group relative block overflow-hidden rounded-3xl bg-brand-900 shadow-xl shadow-brand-900/10 lg:grid lg:grid-cols-5"
    >
      <div className="relative aspect-[16/10] overflow-hidden lg:col-span-3 lg:aspect-auto lg:min-h-[380px]">
        <NewsCover
          src={item.coverImage}
          alt={item.title}
          sizes="(min-width: 1024px) 60vw, 100vw"
          priority
          className="transition duration-700 group-hover:scale-[1.03]"
        />
        <EventBadge item={item} />
      </div>
      <div className="relative flex flex-col justify-center p-6 text-white sm:p-8 lg:col-span-2">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <CategoryChip category={item.category} onDark />
          <time dateTime={item.publishedAt ?? undefined}>{formatDate(item.publishedAt)}</time>
        </div>
        <h3 className="mt-4 text-xl font-bold leading-snug sm:text-2xl">{item.title}</h3>
        {item.summary && <p className="mt-3 line-clamp-3 text-white/75">{item.summary}</p>}
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
          Ətraflı oxu <span className="transition group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Link
      href={`/xeberler/${item.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-200"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <NewsCover
          src={item.coverImage}
          alt={item.title}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="transition duration-500 group-hover:scale-[1.04]"
        />
        <EventBadge item={item} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3 text-xs text-muted">
          <CategoryChip category={item.category} />
          <time dateTime={item.publishedAt ?? undefined}>{formatDate(item.publishedAt)}</time>
        </div>
        <h3 className="mt-3 font-semibold leading-snug group-hover:text-brand-700">{item.title}</h3>
        {item.summary && <p className="mt-2 line-clamp-2 text-sm text-muted">{item.summary}</p>}
      </div>
    </Link>
  );
}
