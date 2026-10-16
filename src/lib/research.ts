/**
 * Elmi profil: ORCID və Google Scholar yoxlaması, nəşrlərin ORCID + OpenAlex-dən çəkilməsi.
 * OpenAlex pulsuz açıq bazadır; OPENALEX_API_KEY təyin olunarsa, ayrıca limitlə işləyir.
 */
import type { Publication, ResearchStats } from "./types";

export const MAX_BIO = 600;
/** Profildə saxlanılan ən çox nəşr sayı */
const MAX_PUBLICATIONS = 200;
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

export const API = "https://api.openalex.org";
const withKey = (url: string) => {
  const key = process.env.OPENALEX_API_KEY;
  return key ? `${url}${url.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(key)}` : url;
};

export async function getJson<T>(url: string): Promise<T> {
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

type Pub = Omit<Publication, "id">;

const OA_SELECT = "&select=id,display_name,publication_year,doi,type,cited_by_count,open_access,primary_location";
const cleanDoi = (d: string | null | undefined) => (d ? d.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() : null);
const titleKey = (t: string) => t.toLocaleLowerCase("az").replace(/[^\p{L}\p{N}]+/gu, "");

function fromOpenAlex(w: OaWork): Pub {
  return {
    workId: w.id.split("/").pop()!,
    title: w.display_name!.slice(0, 500),
    year: w.publication_year,
    venue: w.primary_location?.source?.display_name ?? null,
    doi: cleanDoi(w.doi),
    url: w.doi ?? w.open_access?.oa_url ?? w.primary_location?.landing_page_url ?? null,
    type: w.type,
    citedBy: w.cited_by_count ?? 0,
    openAccess: !!w.open_access?.is_oa,
  };
}

/** ORCID növləri → OpenAlex üslubunda növ açarları */
const ORCID_TYPES: Record<string, string> = {
  "journal-article": "article",
  "book-chapter": "book-chapter",
  book: "book",
  "conference-paper": "conference-paper",
  "conference-abstract": "conference-paper",
  "conference-poster": "conference-paper",
  "dissertation-thesis": "dissertation",
  preprint: "preprint",
  "data-set": "dataset",
  "review": "review",
};

interface OrcidWorkSummary {
  "put-code": number;
  title?: { title?: { value?: string } | null } | null;
  type?: string | null;
  "publication-date"?: { year?: { value?: string } | null } | null;
  "journal-title"?: { value?: string } | null;
  url?: { value?: string } | null;
  "external-ids"?: { "external-id"?: { "external-id-type": string; "external-id-value": string }[] } | null;
}

/**
 * ORCID-in açıq API-si: müəllifin özü təsdiqlədiyi tam siyahı (OpenAlex-də olmayan konfrans
 * materialları da daxil). ORCID profili gizlidirsə və ya cavab gəlmirsə — null.
 */
async function fetchOrcidWorks(orcid: string): Promise<Pub[] | null> {
  try {
    const res = await fetch(`https://pub.orcid.org/v3.0/${orcid}/works`, {
      headers: { Accept: "application/json", "User-Agent": "UNEC-GAS-Platforma/1.0" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { group?: { "work-summary"?: OrcidWorkSummary[] }[] };
    return (data.group ?? []).flatMap((g) => {
      const w = g["work-summary"]?.[0];
      const title = w?.title?.title?.value?.trim();
      if (!w || !title) return [];
      const doi = cleanDoi(w["external-ids"]?.["external-id"]?.find((e) => e["external-id-type"] === "doi")?.["external-id-value"]);
      const year = Number(w["publication-date"]?.year?.value) || null;
      return [
        {
          workId: `orcid-${w["put-code"]}`,
          title: title.slice(0, 500),
          year,
          venue: w["journal-title"]?.value?.trim() || null,
          doi,
          url: doi ? `https://doi.org/${doi}` : (w.url?.value ?? null),
          type: w.type ? (ORCID_TYPES[w.type] ?? w.type) : null,
          citedBy: 0,
          openAccess: false,
        },
      ];
    });
  } catch {
    return null;
  }
}

/** DOI-lərə görə OpenAlex-dən istinad sayı və açıq giriş məlumatı (40-lıq paketlərlə) */
async function openAlexByDoi(dois: string[]): Promise<Map<string, OaWork>> {
  const out = new Map<string, OaWork>();
  for (let i = 0; i < dois.length; i += 40) {
    const chunk = dois.slice(i, i + 40);
    const r = await getJson<{ results: OaWork[] }>(`${API}/works?filter=doi:${chunk.map((d) => encodeURIComponent(`https://doi.org/${d}`)).join("|")}&per-page=50${OA_SELECT}`);
    for (const w of r.results ?? []) {
      const d = cleanDoi(w.doi);
      if (d) out.set(d, w);
    }
  }
  return out;
}

function computeStats(pubs: Pub[]): ResearchStats {
  const cites = pubs.map((p) => p.citedBy).sort((a, b) => b - a);
  return {
    works: pubs.length,
    citations: cites.reduce((a, b) => a + b, 0),
    hIndex: cites.filter((c, i) => c >= i + 1).length,
    i10Index: cites.filter((c) => c >= 10).length,
  };
}

/**
 * ORCID ilə nəşrlər: siyahının əsası ORCID profilidir (müəllifin özü idarə edir),
 * istinad və açıq giriş məlumatı OpenAlex-dən DOI üzrə əlavə olunur.
 * OpenAlex-in müəllifə bağladığı, amma ORCID-də olmayan işlər də siyahıya düşür.
 */
export async function fetchByOrcid(orcid: string): Promise<OrcidSyncResult> {
  const [orcidWorks, authors] = await Promise.all([
    fetchOrcidWorks(orcid),
    getJson<{ results: OaAuthor[] }>(`${API}/authors?filter=orcid:${orcid}&select=id,works_count,cited_by_count,summary_stats`).catch((e: Error) => e),
  ]);
  // OpenAlex əlçatmazdırsa, ORCID siyahısı ilə davam edirik; heç biri yoxdursa — xəta
  if (authors instanceof Error) {
    if (!orcidWorks?.length) throw authors;
    return { openalexId: null, stats: computeStats(orcidWorks), publications: orcidWorks.slice(0, MAX_PUBLICATIONS) };
  }
  const a = authors.results?.[0];
  const shortId = a ? a.id.split("/").pop()! : null;

  const oaWorks = shortId
    ? ((await getJson<{ results: OaWork[] }>(`${API}/works?filter=author.id:${shortId}&sort=publication_year:desc&per-page=${MAX_PUBLICATIONS}${OA_SELECT}`)).results ?? [])
        .filter((w) => w.display_name)
        .map(fromOpenAlex)
    : [];

  if (!orcidWorks?.length) {
    // ORCID profili gizli və ya boşdur — yalnız OpenAlex
    if (!a) return { openalexId: null, stats: null, publications: [] };
    return {
      openalexId: shortId,
      stats: { works: a.works_count ?? 0, citations: a.cited_by_count ?? 0, hIndex: a.summary_stats?.h_index ?? 0, i10Index: a.summary_stats?.i10_index ?? 0 },
      publications: oaWorks,
    };
  }

  // ORCID işlərini OpenAlex ilə zənginləşdir
  const byDoi = new Map(oaWorks.filter((p) => p.doi).map((p) => [p.doi!, p]));
  const missing = orcidWorks.map((p) => p.doi).filter((d): d is string => !!d && !byDoi.has(d));
  if (missing.length) {
    try {
      for (const [d, w] of await openAlexByDoi(missing)) byDoi.set(d, fromOpenAlex(w));
    } catch {
      /* istinad sayı olmadan da siyahı göstərilir */
    }
  }
  const byTitle = new Map(oaWorks.map((p) => [titleKey(p.title), p]));
  const used = new Set<string>();
  const merged: Pub[] = orcidWorks.map((p) => {
    const m = (p.doi && byDoi.get(p.doi)) || byTitle.get(titleKey(p.title));
    if (!m || used.has(m.workId)) return p;
    used.add(m.workId);
    return { ...p, workId: m.workId, venue: p.venue ?? m.venue, url: p.url ?? m.url, citedBy: m.citedBy, openAccess: m.openAccess, year: p.year ?? m.year };
  });
  for (const p of oaWorks) if (!used.has(p.workId)) merged.push(p);
  // Eyni iş ORCID-də bir neçə dəfə ola bilər — DOI/başlıq üzrə təkrarları at
  const keys = new Set<string>();
  const unique = merged.filter((p) => {
    const k = p.doi ?? titleKey(p.title);
    if (keys.has(k) || keys.has(p.workId)) return false;
    keys.add(k).add(p.workId);
    return true;
  });

  const publications = unique.sort((x, y) => (y.year ?? 0) - (x.year ?? 0) || y.citedBy - x.citedBy).slice(0, MAX_PUBLICATIONS);
  return { openalexId: shortId, stats: computeStats(publications), publications };
}

export const PUBLICATION_TYPES: Record<string, string> = {
  article: "Məqalə",
  "book-chapter": "Kitab fəsli",
  book: "Kitab",
  dissertation: "Dissertasiya",
  preprint: "Preprint",
  "conference-paper": "Konfrans materialı",
  review: "İcmal",
  dataset: "Məlumat dəsti",
};
