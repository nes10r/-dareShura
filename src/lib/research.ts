/**
 * Elmi profil: ORCID və Google Scholar yoxlaması, OpenAlex-dən nəşrlərin çəkilməsi.
 * OpenAlex pulsuz açıq bazadır; OPENALEX_API_KEY təyin olunarsa, ayrıca limitlə işləyir.
 */
import type { Publication, ResearchStats } from "./types";

export const MAX_BIO = 600;
/** Profildə saxlanılan ən çox nəşr sayı */
const MAX_PUBLICATIONS = 100;
/** Nəşrlər bu müddətdən köhnədirsə, profilə baxanda fonda yenilənir */
export const PUBS_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * "https://orcid.org/0000-0002-1825-0097" və ya "0000000218250097" → "0000-0002-1825-0097".
 * Nəzarət rəqəmi (ISO 7064 Mod 11-2) yoxlanılır — yanlış yazılmış ORCID qəbul olunmur.
 */
export function normalizeOrcid(input: string): string | null {
  const raw = input.trim().replace(/^https?:\/\/(www\.)?orcid\.org\//i, "").replace(/[\s-]/g, "").toUpperCase();
  if (!/^\d{15}[\dX]$/.test(raw)) return null;
  let total = 0;
  for (const ch of raw.slice(0, 15)) total = (total + Number(ch)) * 2;
  const check = (12 - (total % 11)) % 11;
  if ((check === 10 ? "X" : String(check)) !== raw[15]) return null;
  return raw.match(/.{4}/g)!.join("-");
}

/** Yalnız Google Scholar profil linki: https://scholar.google.com/citations?user=XXXX */
export function normalizeScholarUrl(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const user = u.searchParams.get("user");
    if (!/(^|\.)scholar\.google\.[a-z.]+$/i.test(u.hostname) || !user || !/^[\w-]{6,20}$/.test(user)) return null;
    return `https://scholar.google.com/citations?user=${user}`;
  } catch {
    return null;
  }
}

const API = "https://api.openalex.org";
const withKey = (url: string) => {
  const key = process.env.OPENALEX_API_KEY;
  return key ? `${url}${url.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(key)}` : url;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(withKey(url), {
    headers: { "User-Agent": "UNEC-GAS-Platforma/1.0" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OpenAlex cavab vermədi (HTTP ${res.status}).`);
  return res.json() as Promise<T>;
}

interface OaAuthor {
  id: string;
  works_count: number;
  cited_by_count: number;
  summary_stats?: { h_index?: number; i10_index?: number };
}

interface OaWork {
  id: string;
  display_name: string | null;
  publication_year: number | null;
  doi: string | null;
  type: string | null;
  cited_by_count: number;
  open_access?: { is_oa?: boolean; oa_url?: string | null };
  primary_location?: { landing_page_url?: string | null; source?: { display_name?: string | null } | null } | null;
}

export interface OrcidSyncResult {
  openalexId: string | null;
  stats: ResearchStats | null;
  publications: Omit<Publication, "id">[];
}

/** ORCID ilə müəllifi və onun nəşrlərini (ən yeniləri əvvəl) çəkir */
export async function fetchByOrcid(orcid: string): Promise<OrcidSyncResult> {
  const authors = await getJson<{ results: OaAuthor[] }>(
    `${API}/authors?filter=orcid:${orcid}&select=id,works_count,cited_by_count,summary_stats`,
  );
  const a = authors.results?.[0];
  if (!a) return { openalexId: null, stats: null, publications: [] };

  const shortId = a.id.split("/").pop()!;
  const works = await getJson<{ results: OaWork[] }>(
    `${API}/works?filter=author.id:${shortId}&sort=publication_year:desc&per-page=${MAX_PUBLICATIONS}` +
      "&select=id,display_name,publication_year,doi,type,cited_by_count,open_access,primary_location",
  );

  return {
    openalexId: shortId,
    stats: {
      works: a.works_count ?? 0,
      citations: a.cited_by_count ?? 0,
      hIndex: a.summary_stats?.h_index ?? 0,
      i10Index: a.summary_stats?.i10_index ?? 0,
    },
    publications: (works.results ?? [])
      .filter((w) => w.display_name)
      .map((w) => ({
        workId: w.id.split("/").pop()!,
        title: w.display_name!.slice(0, 500),
        year: w.publication_year,
        venue: w.primary_location?.source?.display_name ?? null,
        doi: w.doi ? w.doi.replace(/^https?:\/\/doi\.org\//i, "") : null,
        url: w.doi ?? w.open_access?.oa_url ?? w.primary_location?.landing_page_url ?? null,
        type: w.type,
        citedBy: w.cited_by_count ?? 0,
        openAccess: !!w.open_access?.is_oa,
      })),
  };
}

export const PUBLICATION_TYPES: Record<string, string> = {
  article: "Məqalə",
  "book-chapter": "Kitab fəsli",
  book: "Kitab",
  dissertation: "Dissertasiya",
  preprint: "Preprint",
  review: "İcmal",
  dataset: "Məlumat dəsti",
};
