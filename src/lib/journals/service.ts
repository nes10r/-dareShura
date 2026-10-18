import {
  getJournals,
  getJournalSearch,
  saveJournalSearch,
  setJournalScopus,
  setJournalSpeed,
  upsertJournals,
} from "../db/repo";
import type { Journal } from "../types";
import { getHijackedList } from "./hijacked";
import { fetchSources, searchJournalIds } from "./openalex";
import { hijackedFor, riskFlags, type RiskFlag } from "./risk";
import { fetchScopus, scopusEnabled } from "./scopus";
import { fetchSpeed } from "./speed";

const DAY = 86_400_000;
/** Axtarış nəticəsi, jurnal göstəriciləri, Scopus və sürət keşinin ömrü */
const SEARCH_TTL = 7 * DAY;
const JOURNAL_TTL = 30 * DAY;

export const normalizeTopic = (q: string) => q.toLocaleLowerCase("az").replace(/\s+/g, " ").trim().slice(0, 120);

export interface JournalHit {
  journal: Journal;
  /** Son 3 ildə bu mövzuda dərc etdiyi məqalə sayı */
  count: number;
  risks: RiskFlag[];
}

const stale = (iso: string | null | undefined, ttl: number) => !iso || Date.now() - Date.parse(iso) > ttl;
/** Scopus məntiqi dəyişib (bütün ISSN-lər yoxlanılır) — bundan əvvəlki yoxlamalar təkrarlanır */
const SCOPUS_LOGIC_SINCE = Date.parse("2026-10-18T15:00:00Z");

/** Paralel, amma bir anda ən çox `n` sorğu (xarici API-lərə hörmət) */
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    for (let x = queue.shift(); x !== undefined; x = queue.shift()) await fn(x);
  }));
}

/**
 * Mövzu → uyğun jurnallar. Nəticə 7 gün keşlənir; jurnal məlumatı 30 gün.
 * Scopus statusu və nəşr sürəti yoxdursa/köhnədirsə — ayrıca vaxt limiti ilə tamamlanır.
 */
export async function findJournals(topic: string): Promise<{ hits: JournalHit[]; total: number }> {
  const key = normalizeTopic(topic);
  if (key.length < 3) return { hits: [], total: 0 };

  const cached = await getJournalSearch(key);
  let results = cached?.results ?? [];
  let total = cached?.total ?? 0;
  if (!cached || Date.now() - cached.createdAt.getTime() > SEARCH_TTL) {
    const r = await searchJournalIds(key);
    results = r.results;
    total = r.total;
    await saveJournalSearch(key, results, total);
  }

  const ids = results.map((r) => r.id);
  let journals = await getJournals(ids);
  const missing = ids.filter((id) => {
    const j = journals.find((x) => x.id === id);
    return !j || !j.worksByYear || stale(j.updatedAt, JOURNAL_TTL);
  });
  if (missing.length) {
    await upsertJournals(await fetchSources(missing));
    journals = await getJournals(ids);
  }
  const [, hijacked] = await Promise.all([enrich(journals), getHijackedList()]);
  journals = await getJournals(ids);

  const byId = new Map(journals.map((j) => [j.id, j]));
  return {
    hits: results.flatMap((r) => {
      const j = byId.get(r.id);
      return j ? [{ journal: j, count: r.count, risks: riskFlags(j, hijackedFor(j, hijacked)) }] : [];
    }),
    total,
  };
}

/**
 * Scopus və nəşr sürəti: yalnız keşdə olmayan/köhnələnlər, ümumi ~9 saniyə limiti ilə.
 * Crossref sürət limiti sərtdir — ardıcıl sorğu; çatmayanlar növbəti axtarışda tamamlanır.
 */
async function enrich(journals: Journal[]) {
  const deadline = Date.now() + 9_000;
  const run = (label: string) => async (t: () => Promise<void>) => {
    if (Date.now() > deadline) return;
    await t().catch((e) => console.error(`[jurnallar] ${label}:`, e instanceof Error ? e.message : e));
  };
  const scopus: (() => Promise<void>)[] = [];
  const speed: (() => Promise<void>)[] = [];
  for (const j of journals) {
    const issns = [...new Set([j.issnL, ...j.issn].filter((x): x is string => !!x))];
    if (scopusEnabled() && (stale(j.scopus?.checkedAt, JOURNAL_TTL) || Date.parse(j.scopus!.checkedAt) < SCOPUS_LOGIC_SINCE)) scopus.push(async () => setJournalScopus(j.id, await fetchScopus(issns)));
    if (stale(j.speed?.checkedAt, JOURNAL_TTL)) speed.push(async () => setJournalSpeed(j.id, await fetchSpeed(issns)));
  }
  await Promise.all([pool(scopus, 4, run("Scopus")), pool(speed, 1, run("Crossref"))]);
}
