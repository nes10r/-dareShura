import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { ConferenceCard } from "@/components/conferences/ConferenceCard";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getSessionUser } from "@/lib/auth";
import { syncIfStale } from "@/lib/conferences/source";
import { compareCurrent, deadlineState, FORMAT_STYLES, isCurrent } from "@/lib/conferences/view";
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
  { key: "aciq", label: "Müraciət açıq" },
  { key: "kecmis", label: "Keçirilənlər" },
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

        {/* Filtrlər: mobildə yana sürüşmür — ekrana tam sığan bərabər hissəli seçimlər */}
        <div className="mt-6 space-y-2 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
          <nav aria-label="Konfrans statusu" className="grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 ring-1 ring-line sm:inline-grid sm:w-auto">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <Link
                  key={t.key}
                  href={href({ tab: t.key })}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center transition sm:flex-row sm:gap-2 sm:px-4 ${
                    active ? "bg-ink text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-[13px] font-semibold leading-tight sm:text-sm">{t.label}</span>
                  <span className={`text-[11px] leading-tight sm:text-xs ${active ? "text-white/70" : "text-muted"}`}>{byTab[t.key].length}</span>
                </Link>
              );
            })}
          </nav>

          <nav aria-label="Format" className="grid grid-cols-4 gap-1 rounded-2xl bg-white p-1 ring-1 ring-line sm:inline-grid sm:w-auto">
            {[null, ...FORMATS].map((f) => {
              const active = format === f;
              return (
                <Link
                  key={f ?? "all"}
                  href={href({ format: f })}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-medium transition sm:px-4 sm:text-sm ${
                    active ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f && <span className={`size-1.5 rounded-full ${active ? "bg-white" : FORMAT_STYLES[f].dot}`} />}
                  {f ?? "Hamısı"}
                </Link>
              );
            })}
          </nav>
        </div>

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
