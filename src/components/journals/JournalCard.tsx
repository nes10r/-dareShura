import { Icon } from "@/components/Icon";
import type { Journal } from "@/lib/types";
import { ShareCallButton } from "./ShareCallButton";

const fmtDays = (d: number) => (d < 45 ? `${d} gün` : `${(d / 30).toFixed(d < 300 ? 1 : 0).replace(".", ",")} ay`);
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/** Scopus statusu: API açarı varsa dəqiq, yoxdursa — Scimago-da (Scopus əsaslı, pulsuz) yoxlama linki */
function ScopusBadge({ j, enabled }: { j: Journal; enabled: boolean }) {
  const issn = j.issnL ?? j.issn[0];
  const s = j.scopus;
  if (enabled && s) {
    if (!s.indexed) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Scopus-da yoxdur</span>;
    if (s.discontinuedAfter) return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">Scopus-dan çıxarılıb ({s.discontinuedAfter})</span>;
    return (
      <a
        href={s.sourceUrl ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 ring-1 ring-orange-200 hover:bg-orange-100"
        title={s.subjects?.join(", ")}
      >
        Scopus{s.quartile ? ` · Q${s.quartile}` : ""}
        {s.citeScore != null && <span className="font-normal">· CiteScore {String(s.citeScore).replace(".", ",")}</span>}
      </a>
    );
  }
  if (!issn) return null;
  return (
    <a
      href={`https://www.scimagojr.com/journalsearch.php?q=${issn}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-orange-800 ring-1 ring-orange-200 hover:bg-orange-50"
    >
      Scopus / kvartil: yoxla <Icon name="arrow-right" className="size-3" />
    </a>
  );
}

export function JournalCard({ j, count, scopusEnabled, suggestions }: { j: Journal; count: number; scopusEnabled: boolean; suggestions: string[] }) {
  const issn = j.issnL ?? j.issn[0];
  const sp = j.speed;
  return (
    <article className="flex h-full flex-col rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold leading-snug">
            {j.homepage ? (
              <a href={j.homepage} target="_blank" rel="noopener noreferrer" className="hover:text-sky-800 hover:underline">
                {j.title}
              </a>
            ) : (
              j.title
            )}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted">
            {[j.publisher, issn && `ISSN ${issn}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="shrink-0 rounded-xl bg-sky-50 px-2.5 py-1.5 text-center leading-tight text-sky-900" title="Son 3 ildə bu mövzuda dərc etdiyi məqalələr">
          <b className="block text-base tabular-nums">{count.toLocaleString("az")}</b>
          <span className="text-[10px]">uyğun məqalə</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <ScopusBadge j={j} enabled={scopusEnabled} />
        {issn && (
          <a
            href={`https://mjl.clarivate.com/search-results?issn=${issn}&hide_exact_match_fl=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200 hover:bg-indigo-50"
          >
            WoS: yoxla <Icon name="arrow-right" className="size-3" />
          </a>
        )}
        {j.isOa ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">Açıq giriş{j.inDoaj ? " · DOAJ" : ""}</span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600" title="Abunə jurnalı: nəşr ödənişsizdir">
            Abunə · nəşr pulsuz
          </span>
        )}
        {j.apcUsd != null && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${j.apcUsd === 0 ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700"}`}>
            {j.apcUsd === 0 ? "Ödənişsiz (APC yoxdur)" : j.isOa ? `APC ${money(j.apcUsd)}` : `Açıq giriş seçimi ${money(j.apcUsd)}`}
          </span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-surface p-2.5 text-center">
        <div title="Göndərilmədən qəbula qədər (median)">
          <dd className="text-sm font-bold tabular-nums">{sp?.acceptDays != null ? fmtDays(sp.acceptDays) : "—"}</dd>
          <dt className="text-[11px] text-muted">qəbula qədər</dt>
        </div>
        <div title="Qəbuldan onlayn nəşrə qədər (median)">
          <dd className="text-sm font-bold tabular-nums">{sp?.publishDays != null ? fmtDays(sp.publishDays) : "—"}</dd>
          <dt className="text-[11px] text-muted">nəşrə qədər</dt>
        </div>
        <div title="h-indeks / 2 illik orta istinad (Impact Factor-a bənzər), OpenAlex">
          <dd className="text-sm font-bold tabular-nums">
            {j.hIndex ?? "—"}
            {j.meanCitedness != null && <span className="font-normal text-muted"> / {String(j.meanCitedness).replace(".", ",")}</span>}
          </dd>
          <dt className="text-[11px] text-muted">h-indeks / ort. ist.</dt>
        </div>
      </dl>
      <p className="mt-1.5 text-[11px] text-muted">
        {sp && sp.sample >= 5
          ? `Sürət: son ${sp.sample} məqalənin tarixləri üzrə (Crossref)`
          : sp
            ? "Sürət: nəşriyyat qəbul tarixlərini paylaşmır"
            : "Sürət hesablanır — bir az sonra yenidən baxın"}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-1 pt-3">
        {j.callsUrl && (
          <a href={j.callsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-50">
            <Icon name="megaphone" className="size-4" /> Xüsusi buraxılışlar
          </a>
        )}
        <ShareCallButton journal={{ id: j.id, title: j.title, callsUrl: j.callsUrl }} suggestions={suggestions} variant="link" />
      </div>
    </article>
  );
}
