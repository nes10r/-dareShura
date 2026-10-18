import type { ScopusInfo } from "../types";

/**
 * Scopus Serial Title API (Elsevier, pulsuz açar — dev.elsevier.com, akademik istifadə).
 * ISSN üzrə: Scopus-da indekslənirmi, CiteScore, SJR, kvartil (CiteScore faizinə görə).
 * SCOPUS_API_KEY yoxdursa — null (interfeysdə "Scopus-da yoxla" linki göstərilir).
 */

export const scopusEnabled = () => !!process.env.SCOPUS_API_KEY;

type Val = string | number | null | undefined;
const num = (v: Val) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

interface SubjectRank {
  subjectCode?: Val;
  percentile?: Val;
}
interface CiteScoreYearInfo {
  "@year"?: Val;
  "@status"?: string;
  citeScoreInformationList?: { citeScoreInfo?: { citeScore?: Val; citeScoreSubjectRank?: SubjectRank[] }[] }[];
}
interface ScopusEntry {
  error?: string;
  coverageEndYear?: Val;
  "source-id"?: Val;
  "subject-area"?: { $?: string }[];
  SJRList?: { SJR?: { "@year"?: Val; $?: Val }[] };
  citeScoreYearInfoList?: {
    citeScoreCurrentMetric?: Val;
    citeScoreCurrentMetricYear?: Val;
    citeScoreYearInfo?: CiteScoreYearInfo[];
  };
  link?: { "@ref"?: string; "@href"?: string }[];
}

const quartileOf = (p: number | null) => (p == null ? null : p >= 75 ? 1 : p >= 50 ? 2 : p >= 25 ? 3 : 4);

export async function fetchScopus(issns: string[]): Promise<ScopusInfo | null> {
  const key = process.env.SCOPUS_API_KEY;
  if (!key || !issns.length) return null;
  const checkedAt = new Date().toISOString();
  // Ad dəyişəndə köhnə ISSN köhnə Scopus qeydinə aparır (məs. Palgrave Communications → HSSC):
  // bütün ISSN-lər yoxlanılır, əhatəsi ən son ilə qədər olan qeyd seçilir
  type Found = ScopusInfo & { coverageEnd: number | null };
  const found: Found[] = [];

  for (const issn of issns.slice(0, 3)) {
    const res = await fetch(`https://api.elsevier.com/content/serial/title/issn/${encodeURIComponent(issn)}?view=CITESCORE`, {
      headers: { "X-ELS-APIKey": key, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`Scopus API: HTTP ${res.status}`);
    const data = (await res.json()) as { "serial-metadata-response"?: { entry?: ScopusEntry[] } };
    const e = data["serial-metadata-response"]?.entry?.[0];
    if (!e || e.error) continue;

    const endYear = num(e.coverageEndYear);
    const thisYear = new Date().getUTCFullYear();
    const years = e.citeScoreYearInfoList?.citeScoreYearInfo ?? [];
    // Ən son tamamlanmış ilin CiteScore faizləri — ən yaxşı fənn üzrə kvartil
    const complete = years.filter((y) => y["@status"] === "Complete").sort((a, b) => (num(b["@year"]) ?? 0) - (num(a["@year"]) ?? 0))[0];
    const ranks = complete?.citeScoreInformationList?.[0]?.citeScoreInfo?.[0]?.citeScoreSubjectRank ?? [];
    const best = ranks.reduce<number | null>((m, r) => {
      const p = num(r.percentile);
      return p != null && (m == null || p > m) ? p : m;
    }, null);
    const sjr = [...(e.SJRList?.SJR ?? [])].sort((a, b) => (num(b["@year"]) ?? 0) - (num(a["@year"]) ?? 0))[0];

    found.push({
      indexed: true,
      discontinuedAfter: endYear && endYear < thisYear - 1 ? endYear : null,
      citeScore: num(e.citeScoreYearInfoList?.citeScoreCurrentMetric),
      citeScoreYear: num(e.citeScoreYearInfoList?.citeScoreCurrentMetricYear),
      sjr: num(sjr?.$),
      quartile: quartileOf(best),
      subjects: (e["subject-area"] ?? []).map((s) => s.$ ?? "").filter(Boolean).slice(0, 4),
      sourceUrl: e["source-id"] ? `https://www.scopus.com/sourceid/${e["source-id"]}` : (e.link?.find((l) => l["@ref"] === "scopus-source")?.["@href"] ?? null),
      checkedAt,
      coverageEnd: endYear,
    });
  }
  if (!found.length) return { indexed: false, checkedAt };
  const { coverageEnd: _c, ...info } = found.sort((a, b) => (b.coverageEnd ?? 9999) - (a.coverageEnd ?? 9999))[0];
  return info;
}
