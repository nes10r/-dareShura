import type { JournalUpsert } from "../db/repo";
import { API, getJson } from "../research";

/**
 * Mövzuya uyğun jurnallar: OpenAlex-də son 3 ildə bu mövzuda məqalə dərc edən jurnallar
 * məqalə sayına görə qruplaşdırılır (group_by), sonra jurnalların göstəriciləri çəkilir.
 */

const YEARS = 3;
export const MAX_RESULTS = 24;

interface GroupResult {
  meta: { count: number };
  group_by: { key: string; key_display_name: string; count: number }[];
}

export async function searchJournalIds(topic: string): Promise<{ results: { id: string; count: number }[]; total: number }> {
  const from = `${new Date().getUTCFullYear() - YEARS}-01-01`;
  const q = encodeURIComponent(topic.replace(/[|,:]/g, " "));
  const r = await getJson<GroupResult>(
    `${API}/works?search=${q}&filter=from_publication_date:${from},type:article,primary_location.source.type:journal&group_by=primary_location.source.id&per-page=${MAX_RESULTS + 6}`,
  );
  return {
    total: r.meta?.count ?? 0,
    results: (r.group_by ?? [])
      .filter((g) => g.key && g.key !== "unknown")
      .map((g) => ({ id: g.key.split("/").pop()!, count: g.count }))
      .slice(0, MAX_RESULTS),
  };
}

interface OaSource {
  id: string;
  display_name: string;
  issn_l: string | null;
  issn: string[] | null;
  host_organization_name: string | null;
  homepage_url: string | null;
  is_oa: boolean;
  is_in_doaj: boolean;
  apc_usd: number | null;
  works_count: number;
  listed_in?: string[] | null;
  summary_stats?: { h_index?: number; "2yr_mean_citedness"?: number };
  counts_by_year?: { year: number; works_count: number }[];
}

/**
 * Məlum nəşriyyatlarda jurnalın xüsusi buraxılışlar / çağırışlar səhifəsi (ana səhifə linkindən).
 * Bu saytlar serverdən avtomatik oxumağı bloklayır — ona görə üzvə birbaşa link veririk.
 */
export function callsUrlOf(homepage: string | null): string | null {
  if (!homepage) return null;
  let m: RegExpMatchArray | null;
  if ((m = homepage.match(/springer\.com\/journal\/(\d{3,6})/i))) return `https://link.springer.com/journal/${m[1]}/updates`;
  if ((m = homepage.match(/mdpi\.com\/journal\/([\w-]+)/i))) return `https://www.mdpi.com/journal/${m[1]}/special_issues`;
  if ((m = homepage.match(/(?:journals\.elsevier\.com|sciencedirect\.com\/journal)\/([\w-]+)/i))) return `https://www.sciencedirect.com/journal/${m[1]}/about/call-for-papers`;
  if ((m = homepage.match(/frontiersin\.org\/journals\/([\w-]+)/i))) return `https://www.frontiersin.org/journals/${m[1]}/research-topics`;
  return null;
}

export async function fetchSources(ids: string[]): Promise<JournalUpsert[]> {
  if (!ids.length) return [];
  const r = await getJson<{ results: OaSource[] }>(
    `${API}/sources?filter=ids.openalex:${ids.join("|")}&per-page=${ids.length}` +
      "&select=id,display_name,issn_l,issn,host_organization_name,homepage_url,is_oa,is_in_doaj,apc_usd,works_count,listed_in,summary_stats,counts_by_year",
  );
  return (r.results ?? []).map((s) => ({
    id: s.id.split("/").pop()!,
    title: s.display_name,
    issnL: s.issn_l,
    issn: s.issn ?? [],
    publisher: s.host_organization_name,
    homepage: s.homepage_url,
    isOa: !!s.is_oa,
    inDoaj: !!s.is_in_doaj,
    apcUsd: s.apc_usd ?? null,
    hIndex: s.summary_stats?.h_index ?? null,
    meanCitedness: s.summary_stats?.["2yr_mean_citedness"] != null ? Math.round(s.summary_stats["2yr_mean_citedness"] * 100) / 100 : null,
    worksCount: s.works_count ?? null,
    worksByYear: Object.fromEntries((s.counts_by_year ?? []).slice(0, 6).map((c) => [String(c.year), c.works_count])),
    listedIn: s.listed_in ?? [],
    callsUrl: callsUrlOf(s.homepage_url),
  }));
}
