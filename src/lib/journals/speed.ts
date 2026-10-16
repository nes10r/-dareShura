import type { PublishSpeed } from "../types";

/**
 * Nəşr sürəti: Crossref-də məqalələrin "received / accepted / first_online" tarixləri.
 * Springer, Taylor & Francis, Wiley bu tarixləri paylaşır; Elsevier və MDPI paylaşmır — onda null.
 * Son 1,5 ildəki 60 məqalə üzrə median gün sayı hesablanır.
 */

const DAY = 86_400_000;

/** "24 March 2025" və ya "2025-03-24" */
function parseDate(v: string | undefined) {
  if (!v) return null;
  const t = Date.parse(v.trim());
  return Number.isNaN(t) ? null : t;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);
};

interface CrossrefItem {
  assertion?: { name: string; value?: string }[];
}

/** Crossref bəzən jurnalı yalnız bir ISSN ilə tanıyır (çap və ya elektron) — hər ikisi yoxlanılır */
export async function fetchSpeed(issns: string[]): Promise<PublishSpeed | null> {
  let last: PublishSpeed | null = null;
  for (const issn of issns.slice(0, 2)) {
    last = await fetchSpeedFor(issn);
    if (last && last.sample > 0) return last;
  }
  return last;
}

async function fetchSpeedFor(issn: string): Promise<PublishSpeed | null> {
  const from = new Date(Date.now() - 540 * DAY).toISOString().slice(0, 10);
  const res = await fetch(
    `https://api.crossref.org/journals/${encodeURIComponent(issn)}/works?filter=from-pub-date:${from},type:journal-article&rows=60&select=assertion`,
    { headers: { "User-Agent": "UNEC-GAS-Platforma/1.0" }, signal: AbortSignal.timeout(12_000), cache: "no-store" },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Crossref: HTTP ${res.status}`);
  const items = ((await res.json()) as { message?: { items?: CrossrefItem[] } }).message?.items ?? [];

  const accept: number[] = [];
  const publish: number[] = [];
  for (const it of items) {
    const a = Object.fromEntries((it.assertion ?? []).map((x) => [x.name, x.value]));
    const received = parseDate(a.received);
    const accepted = parseDate(a.accepted);
    const online = parseDate(a.first_online ?? a.published);
    // Mənasız dəyərləri (mənfi və ya 3 ildən uzun) atırıq
    if (received && accepted && accepted >= received && accepted - received < 1100 * DAY) accept.push((accepted - received) / DAY);
    if (accepted && online && online >= accepted && online - accepted < 400 * DAY) publish.push((online - accepted) / DAY);
  }
  const sample = Math.max(accept.length, publish.length);
  if (sample < 5) return { sample, acceptDays: null, publishDays: null, checkedAt: new Date().toISOString() };
  return {
    sample,
    acceptDays: accept.length >= 5 ? median(accept) : null,
    publishDays: publish.length >= 5 ? median(publish) : null,
    checkedAt: new Date().toISOString(),
  };
}
