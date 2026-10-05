import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Countdown } from "@/components/conferences/Countdown";
import { DateBlock, FeeChip, FormatChip } from "@/components/conferences/ConferenceCard";
import { Icon } from "@/components/Icon";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { getSessionUser } from "@/lib/auth";
import { deadlineState, eventState, urgency } from "@/lib/conferences/view";
import { getConference } from "@/lib/db/repo";
import { formatDate } from "@/lib/format";
import { sanitizeNewsHtml } from "@/lib/news-sanitize";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = await getConference((await params).id);
  return c && !c.hidden ? { title: c.title, description: c.summary } : {};
}

const BAND = {
  critical: "from-red-600 to-red-700",
  soon: "from-amber-500 to-amber-600",
  normal: "from-brand-700 to-brand-900",
  past: "from-slate-500 to-slate-600",
  none: "from-brand-700 to-brand-900",
} as const;

/** "15–16 oktyabr 2026", "30 sentyabr – 2 oktyabr 2026" */
function dateRange(start: string, end: string | null) {
  const a = formatDate(start);
  if (!end || a === formatDate(end)) return a;
  const [d1, m1, y1] = a.split(" ");
  const [d2, m2, y2] = formatDate(end).split(" ");
  if (y1 !== y2) return `${a} – ${formatDate(end)}`;
  return m1 === m2 ? `${d1}–${d2} ${m2} ${y2}` : `${d1} ${m1} – ${d2} ${m2} ${y2}`;
}

export default async function ConferencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, c] = await Promise.all([getSessionUser(), getConference(id)]);
  if (!c || c.hidden) notFound();

  const cta = user ? { href: "/dashboard", label: "Kabinet" } : { href: "/login", label: "Daxil ol" };
  const dl = deadlineState(c);
  const ev = eventState(c);
  // Geri sayım: müraciət açıqdırsa — son tarixə, yoxsa — konfransın başlamasına
  const target = dl === "open" ? c.deadline : ev === "upcoming" ? c.startsAt : null;
  const u = urgency(target);

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader cta={cta} />
      <main className="flex-1 pb-16 pt-20 sm:pt-24">
        <article className="mx-auto max-w-3xl px-4">
          <Link href="/konfranslar" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
            <Icon name="chevron-left" className="size-4" /> Konfranslar
          </Link>

          <div className="mt-3 flex gap-4">
            <DateBlock c={c} />
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{c.title}</h1>
          </div>

          {/* Geri sayım */}
          <section className={`mt-6 rounded-3xl bg-gradient-to-br p-5 text-white shadow-lg sm:p-6 ${BAND[u]}`}>
            {target ? (
              <>
                <p className="flex items-center gap-2 text-sm font-medium opacity-90">
                  <Icon name="clock" className="size-4" />
                  {dl === "open" ? `Son müraciət: ${formatDate(c.deadline)}` : `Konfransın başlamasına (${formatDate(c.startsAt)})`}
                </p>
                <div className="mt-3">
                  <Countdown target={target} variant="boxes" fallback={<span className="text-2xl font-bold">{formatDate(target)}</span>} />
                </div>
              </>
            ) : (
              <p className="flex items-center gap-2 font-medium">
                <Icon name="clock" className="size-5" />
                {dl === "closed"
                  ? `Müraciət müddəti bitib (${formatDate(c.deadline)})`
                  : ev === "past"
                    ? "Konfrans keçirilib"
                    : "Son müraciət tarixi elanda göstərilməyib"}
              </p>
            )}
          </section>

          {/* Əsas məlumatlar */}
          <dl className="mt-6 grid gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line sm:grid-cols-2">
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700 ring-1 ring-line">
                <Icon name="calendar" className="size-5" />
              </span>
              <div>
                <dt className="text-xs text-muted">Keçirilmə tarixi</dt>
                <dd className="font-medium">{c.startsAt ? dateRange(c.startsAt, c.endsAt) : "Göstərilməyib"}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700 ring-1 ring-line">
                <Icon name="pin" className="size-5" />
              </span>
              <div>
                <dt className="text-xs text-muted">Məkan</dt>
                <dd className="font-medium">{c.location ?? "Göstərilməyib"}</dd>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <FormatChip format={c.format} />
              <FeeChip c={c} />
            </div>
            {c.deadlines.length > 1 && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Mühüm tarixlər</dt>
                <dd className="mt-2 space-y-1.5">
                  {c.deadlines.map((d) => (
                    <p
                      key={d.date + d.label}
                      className={`flex justify-between gap-3 text-sm ${Date.parse(d.date) < Date.now() ? "text-muted line-through" : ""}`}
                    >
                      <span>{d.label}</span>
                      <span className="font-medium">{formatDate(d.date)}</span>
                    </p>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-4 grid gap-2 sm:flex">
            <a
              href={c.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800"
            >
              <Icon name="link" className="size-5" /> Mənbədə oxu
            </a>
            {c.startsAt && ev !== "past" && (
              <a
                href={`/konfranslar/${c.id}/ics`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold ring-1 ring-line hover:bg-slate-50"
              >
                <Icon name="calendar" className="size-5" /> Təqvimə əlavə et
              </a>
            )}
          </div>

          {c.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.image} alt="" loading="lazy" className="mt-8 max-h-96 w-full rounded-2xl bg-surface object-contain" />
          )}

          <div
            className="rich-text mt-8 text-[17px] leading-relaxed text-slate-700"
            dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(c.bodyHtml) }}
          />

          <p className="mt-10 border-t border-line pt-4 text-xs text-muted">
            Mənbə:{" "}
            <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              news.unec.edu.az
            </a>{" "}
            · Elan tarixi: {formatDate(c.publishedAt)}. Tarix, format və ödəniş məlumatları elan mətnindən avtomatik müəyyən edilir —
            dəqiq şərtlər üçün mənbəyə baxın.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
