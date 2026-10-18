import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import type { JournalAuthor } from "@/lib/db/repo";
import type { RiskFlag } from "@/lib/journals/risk";
import { avatarUrl } from "@/lib/format";
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

/** "UNEC-dən kim burada dərc edib?" — həmkara rəy prosesi barədə sual vermək üçün profilə keçid */
function Colleagues({ j, authors, meId }: { j: Journal; authors: JournalAuthor[]; meId: string }) {
  const SHOW = 4;
  const topic = `«${j.title}» haqqında sual`.slice(0, 80);
  const others = authors.filter((a) => a.userId !== meId);
  const me = authors.find((a) => a.userId === meId);
  return (
    <div className="mt-3 rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-200">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
        <Icon name="users" className="size-4" /> UNEC-dən burada dərc edənlər · {authors.length}
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {others.slice(0, SHOW).map((a) => (
          <li key={a.userId}>
            <Link
              href={`/tedqiqatcilar/${a.userId}?movzu=${encodeURIComponent(topic)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white py-0.5 pl-0.5 pr-2.5 text-sm ring-1 ring-emerald-200 transition hover:ring-emerald-400"
              title={`${a.count} məqalə${a.lastYear ? `, sonuncu ${a.lastYear}` : ""} — rəy prosesi barədə soruşun`}
            >
              <Avatar name={a.name} src={avatarUrl({ id: a.userId, avatarUpdatedAt: a.avatarUpdatedAt })} size="xs" />
              <span className="font-medium">{a.name}</span>
              <span className="text-xs text-muted">{a.lastYear ?? ""}</span>
            </Link>
          </li>
        ))}
        {others.length > SHOW && <li className="self-center text-xs font-medium text-emerald-900">+{others.length - SHOW}</li>}
        {me && <li className="self-center rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-semibold text-white">Siz də ({me.count})</li>}
      </ul>
      {others.length > 0 && <p className="mt-1.5 text-[11px] text-emerald-900/80">Rəy prosesi və redaktorlar barədə soruşmaq üçün həmkarın adına klikləyin</p>}
    </div>
  );
}

/** Risk nişanları: qırmızı — ciddi (saxta sayt, Scopus-dan çıxarılma), sarı — diqqət */
function Risks({ flags }: { flags: RiskFlag[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {flags.map((f) => (
        <li key={f.code}>
          <details className={`group rounded-xl px-3 py-2 ring-1 ${f.level === "high" ? "bg-red-50 text-red-900 ring-red-200" : "bg-amber-50 text-amber-900 ring-amber-200"}`}>
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true">{f.level === "high" ? "⛔" : "⚠️"}</span>
              <span className="flex-1">{f.title}</span>
              <Icon name="chevron-right" className="size-4 shrink-0 opacity-60 transition group-open:rotate-90" />
            </summary>
            <p className="mt-1.5 text-xs leading-relaxed opacity-90">{f.detail}</p>
            {f.links && (
              <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs font-semibold">
                {f.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {l.label}
                  </a>
                ))}
              </p>
            )}
          </details>
        </li>
      ))}
    </ul>
  );
}

export function JournalCard({
  j,
  count,
  risks = [],
  scopusEnabled,
  suggestions,
  authors = [],
  meId,
}: {
  j: Journal;
  count: number;
  scopusEnabled: boolean;
  suggestions: string[];
  authors?: JournalAuthor[];
  meId: string;
  risks?: RiskFlag[];
}) {
  const issn = j.issnL ?? j.issn[0];
  const sp = j.speed;
  return (
    <article className={`flex h-full flex-col rounded-2xl bg-white p-4 ring-1 sm:p-5 ${risks.some((r) => r.level === "high") ? "ring-red-300" : "ring-line"}`}>
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
          <span
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
            title={j.apcUsd != null ? "Abunə/hibrid jurnal: adi yolla nəşr ödənişsizdir, açıq giriş istəyə bağlıdır" : "Nəşr haqqı barədə məlumat yoxdur — jurnalın saytında yoxlayın"}
          >
            {j.apcUsd != null ? "Abunə · nəşr pulsuz" : "Abunə (APC məlumatı yoxdur)"}
          </span>
        )}
        {j.apcUsd != null && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${j.apcUsd === 0 ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700"}`}>
            {j.apcUsd === 0 ? "Ödənişsiz (APC yoxdur)" : j.isOa ? `APC ${money(j.apcUsd)}` : `Açıq giriş seçimi ${money(j.apcUsd)}`}
          </span>
        )}
      </div>

      {risks.length > 0 && <Risks flags={risks} />}

      {authors.length > 0 && <Colleagues j={j} authors={authors} meId={meId} />}

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
