import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { ConferenceCard } from "@/components/conferences/ConferenceCard";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getSessionUser } from "@/lib/auth";
import { syncIfStale } from "@/lib/conferences/source";
import { compareCurrent, deadlineState, isCurrent } from "@/lib/conferences/view";
import { listConferences } from "@/lib/db/repo";
import type { ConferenceFormat } from "@/lib/types";

// Fonda yenilənmə (after) üçün vaxt
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Konfranslar və elmi tədbirlər",
  description: "Gənc tədqiqatçılar üçün yaxınlaşan konfranslar, müraciət son tarixləri, format və iştirak şərtləri.",
};

const TABS = [
  { key: "aktual", label: "Yaxınlaşan" },
  { key: "aciq", label: "Müraciət açıqdır" },
  { key: "kecmis", label: "Son keçirilənlər" },
] as const;
const FORMATS: ConferenceFormat[] = ["Əyani", "Onlayn", "Hibrid"];

export default async function ConferencesPage({ searchParams }: { searchParams: Promise<{ tab?: string; format?: string }> }) {
  const { tab: rawTab, format: rawFormat } = await searchParams;
  const tab = TABS.find((t) => t.key === rawTab)?.key ?? "aktual";
  const format = FORMATS.find((f) => f === rawFormat) ?? null;

  // Mənbədə yeni elan varsa — səhifə cavabını gözlətmədən fonda yenilə
  after(() => syncIfStale().catch((e) => console.error("[konfranslar] sinxronizasiya:", e)));

  const [user, all] = await Promise.all([getSessionUser(), listConferences()]);
  const cta = user ? { href: "/dashboard", label: "Kabinet" } : { href: "/login", label: "Daxil ol" };

  const byTab = {
    aktual: all.filter((c) => isCurrent(c)).sort(compareCurrent),
    aciq: all.filter((c) => deadlineState(c) === "open").sort(compareCurrent),
    kecmis: all.filter((c) => !isCurrent(c)).sort((a, b) => Date.parse(b.startsAt ?? b.publishedAt) - Date.parse(a.startsAt ?? a.publishedAt)),
  };
  const items = byTab[tab].filter((c) => !format || c.format === format);
  const href = (p: { tab?: string; format?: string | null }) => {
    const q = new URLSearchParams();
    const t = p.tab ?? tab;
    const f = p.format === undefined ? format : p.format;
    if (t !== "aktual") q.set("tab", t);
    if (f) q.set("format", f);
    return `/konfranslar${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <SiteHeader cta={cta} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-24 sm:pt-28">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Konfranslar və elmi tədbirlər</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Müraciət son tarixləri, format və iştirak şərtləri bir baxışda. Elanlar{" "}
          <a href="https://news.unec.edu.az/elan/86-konfrans" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline underline-offset-2">
            news.unec.edu.az
          </a>{" "}
          saytından avtomatik yenilənir.
        </p>

        <nav className="-mx-4 mt-6 overflow-x-auto px-4" aria-label="Filtrlər">
          <ul className="flex w-max items-center gap-2">
            {TABS.map((t) => (
              <li key={t.key}>
                <Link
                  href={href({ tab: t.key })}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
                    tab === t.key ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-line hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                  <span className={`text-xs ${tab === t.key ? "text-white/70" : "text-muted"}`}>{byTab[t.key].length}</span>
                </Link>
              </li>
            ))}
            <li aria-hidden="true" className="mx-1 h-6 w-px bg-line" />
            {FORMATS.map((f) => (
              <li key={f}>
                <Link
                  href={href({ format: format === f ? null : f })}
                  aria-pressed={format === f}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition ${
                    format === f ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-line hover:bg-slate-50"
                  }`}
                >
                  {f}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {items.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => <ConferenceCard key={c.id} c={c} />)}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl bg-white p-10 text-center text-muted ring-1 ring-line">Bu filtrə uyğun konfrans yoxdur.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
