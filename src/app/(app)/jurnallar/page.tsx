import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { JournalCard } from "@/components/journals/JournalCard";
import { JournalTabs } from "@/components/journals/JournalTabs";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { findJournalAuthors, listActiveCalls, listAllSkills } from "@/lib/db/repo";
import { scopusEnabled } from "@/lib/journals/scopus";
import { findJournals } from "@/lib/journals/service";
import type { Journal } from "@/lib/types";

export const metadata: Metadata = { title: "Jurnallar" };
export const maxDuration = 60;

type Params = { q?: string; scopus?: string; oa?: string; pulsuz?: string; unec?: string; risksiz?: string; sirala?: string };

const EXAMPLES = ["econometrics panel data", "machine learning finance", "renewable energy economics", "digital marketing", "supply chain management"];

const SORTS = [
  { key: "", label: "Uyğunluq" },
  { key: "h", label: "h-indeks" },
  { key: "suret", label: "Sürət" },
] as const;

function sortHits<T extends { journal: Journal }>(hits: T[], sort: string): T[] {
  if (sort === "h") return [...hits].sort((a, b) => (b.journal.hIndex ?? -1) - (a.journal.hIndex ?? -1));
  if (sort === "suret") {
    const total = (j: Journal) => (j.speed?.acceptDays != null ? j.speed.acceptDays + (j.speed.publishDays ?? 0) : Infinity);
    return [...hits].sort((a, b) => total(a.journal) - total(b.journal));
  }
  return hits;
}

async function Results({ p, meId }: { p: Params; meId: string }) {
  const q = (p.q ?? "").trim();
  let res: Awaited<ReturnType<typeof findJournals>>;
  try {
    res = await findJournals(q);
  } catch (e) {
    console.error("[jurnallar] axtarış:", e);
    return (
      <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
        OpenAlex bazası hazırda cavab vermir. Bir neçə dəqiqədən sonra yenidən cəhd edin.
      </p>
    );
  }
  const scopus = scopusEnabled();
  const [suggestions, authors] = await Promise.all([listAllSkills(), findJournalAuthors(res.hits.map((h) => ({ id: h.journal.id, title: h.journal.title })))]);
  const withColleagues = res.hits.filter((h) => authors.get(h.journal.id)?.some((a) => a.userId !== meId)).length;
  let hits = res.hits;
  const risky = res.hits.filter((h) => h.risks.length).length;
  if (p.risksiz === "1") hits = hits.filter((h) => !h.risks.length);
  if (p.unec === "1") hits = hits.filter((h) => authors.get(h.journal.id)?.some((a) => a.userId !== meId));
  if (p.scopus === "1" && scopus) hits = hits.filter((h) => h.journal.scopus?.indexed && !h.journal.scopus.discontinuedAfter);
  if (p.oa === "1") hits = hits.filter((h) => h.journal.isOa);
  // Ödənişsiz: APC 0 və ya hibrid jurnal (APC yalnız istəyə bağlı açıq giriş üçündür).
  // APC məlumatı olmayan jurnallar daxil edilmir — "pulsuz" demək üçün əsas yoxdur.
  if (p.pulsuz === "1") hits = hits.filter((h) => h.journal.apcUsd === 0 || (!h.journal.isOa && h.journal.apcUsd != null));
  hits = sortHits(hits, p.sirala ?? "");

  const href = (patch: Partial<Params>) => {
    const s = new URLSearchParams();
    const next = { ...p, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) s.set(k, v);
    return `/jurnallar?${s}`;
  };
  const chip = (on: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition ${on ? "bg-sky-700 text-white" : "bg-white text-slate-700 ring-1 ring-line hover:bg-slate-50"}`;

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {scopus && (
          <Link prefetch={false} href={href({ scopus: p.scopus === "1" ? "" : "1" })} className={chip(p.scopus === "1")} aria-pressed={p.scopus === "1"}>
            Yalnız Scopus
          </Link>
        )}
        <Link prefetch={false} href={href({ oa: p.oa === "1" ? "" : "1" })} className={chip(p.oa === "1")} aria-pressed={p.oa === "1"}>
          Açıq giriş
        </Link>
        <Link prefetch={false} href={href({ pulsuz: p.pulsuz === "1" ? "" : "1" })} className={chip(p.pulsuz === "1")} aria-pressed={p.pulsuz === "1"} title="Nəşr haqqı (APC) tələb etməyən jurnallar: ödənişsiz açıq giriş və ya abunə jurnalları">
          Nəşr haqqı yoxdur
        </Link>
        {withColleagues > 0 && (
          <Link prefetch={false} href={href({ unec: p.unec === "1" ? "" : "1" })} className={chip(p.unec === "1")} aria-pressed={p.unec === "1"} title="UNEC üzvlərinin dərc etdiyi jurnallar">
            <Icon name="users" className="size-4" /> Həmkarlar dərc edib · {withColleagues}
          </Link>
        )}
        {risky > 0 && (
          <Link prefetch={false} href={href({ risksiz: p.risksiz === "1" ? "" : "1" })} className={chip(p.risksiz === "1")} aria-pressed={p.risksiz === "1"} title="Risk nişanı olan jurnalları gizlət">
            Risk nişanlılarını gizlət · {risky}
          </Link>
        )}
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        {SORTS.map((s) => (
          <Link key={s.key} prefetch={false} href={href({ sirala: s.key })} className={`inline-flex h-9 items-center rounded-full px-3 text-sm ${(p.sirala ?? "") === s.key ? "bg-ink font-semibold text-white" : "text-slate-600 hover:bg-white"}`}>
            {s.label}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted">
        Son 3 ildə bu mövzuda <b className="text-ink">{res.total.toLocaleString("az")}</b> məqalə · {hits.length} jurnal
      </p>
      {hits.length ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {hits.map((h) => (
            <JournalCard key={h.journal.id} j={h.journal} count={h.count} scopusEnabled={scopus} suggestions={suggestions} authors={authors.get(h.journal.id)} meId={meId} risks={h.risks} />
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-white p-8 text-center ring-1 ring-line">
          <p className="font-medium">Uyğun jurnal tapılmadı</p>
          <p className="mt-1 text-sm text-muted">Mövzunu ingiliscə və daha ümumi yazın və ya filtrləri götürün.</p>
        </div>
      )}
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Mənbələr: OpenAlex (uyğunluq, h-indeks, açıq giriş, APC), Crossref (nəşr sürəti), Retraction Watch (saxta saytlar){scopus ? ", Scopus API (indeks, CiteScore, kvartil)" : ""}. WoS statusu Clarivate Master Journal List-də yoxlanılır.
        Jurnal seçməzdən əvvəl rəsmi saytı yoxlayın.
      </p>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-6" aria-busy="true" aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-muted">
        <span className="size-4 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" /> Jurnallar axtarılır, göstəricilər yoxlanılır…
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-60 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
        ))}
      </div>
    </div>
  );
}

export default async function JournalsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const me = await requireUser();
  const p = await searchParams;
  const q = (p.q ?? "").trim();
  const calls = await listActiveCalls();
  const nonLatin = /[əğıöüşçƏĞİÖÜŞÇ]/.test(q);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:pt-10">
      <h1 className="text-2xl font-bold tracking-tight">Jurnal tapmaq köməkçisi</h1>
      <p className="mt-1 text-muted">Məqalənizin mövzusunu yazın — bu mövzuda dərc edən jurnalları göstəriciləri ilə birlikdə göstərək</p>
      <JournalTabs active="find" callCount={calls.length} />

      <form className="mt-5" role="search" action="/jurnallar">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q}
            type="search"
            required
            minLength={3}
            placeholder="Məqalənin mövzusu, məs. econometrics panel data banking"
            className="h-12 w-full rounded-xl border border-line bg-white pl-12 pr-28 text-base outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
          <button type="submit" className="absolute inset-y-1.5 right-1.5 rounded-lg bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800">
            Axtar
          </button>
        </div>
        {nonLatin && <p className="mt-2 text-xs text-amber-800">Beynəlxalq jurnallar əsasən ingiliscə indekslənir — mövzunu ingiliscə yazsanız, nəticələr daha dəqiq olar.</p>}
      </form>

      {q.length >= 3 ? (
        <Suspense key={JSON.stringify(p)} fallback={<ResultsSkeleton />}>
          <Results p={p} meId={me.id} />
        </Suspense>
      ) : (
        <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-line sm:p-6">
          <p className="font-semibold">Necə işləyir?</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li>• Son 3 ildə sizin mövzunuzda ən çox məqalə dərc edən jurnallar seçilir (OpenAlex).</li>
            <li>• Hər jurnal üçün: Scopus/WoS statusu, açıq giriş və nəşr haqqı (APC), h-indeks.</li>
            <li>• Nəşr sürəti — son məqalələrin göndərilmə, qəbul və nəşr tarixlərindən hesablanır.</li>
          </ul>
          <p className="mt-4 text-sm font-medium">Nümunə ilə başlayın:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => (
              <Link key={e} prefetch={false} href={`/jurnallar?q=${encodeURIComponent(e)}`} className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-100">
                {e}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
