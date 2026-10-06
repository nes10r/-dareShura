import { rootCertificates } from "node:tls";
import { decodeHTML } from "entities";
import { Agent, fetch as undiciFetch } from "undici";
import { absolute, cleanBody, get as getUnec, parseListing, SourceError, text } from "../conferences/source";
import { extractConference } from "../conferences/extract";
import { deleteGrants, getState, listGrantIds, listGrants, setState, upsertGrant } from "../db/repo";
import type { Grant, GrantDocument } from "../types";
import { SECTIGO_DV_R36 } from "./aef-ca";

/**
 * Qrant müsabiqələrinin mənbələri:
 *  - Azərbaycan Elm Fondu — aef.gov.az/az/grant ("Cari qrant müsabiqələri"). Şərtlər PDF-dədir,
 *    ona görə başlıq, tarix, şəkil və sənəd linkləri çəkilir; son tarixi admin daxil edir.
 *  - UNEC — news.unec.edu.az "Müsabiqə" bölməsindən başlığında "qrant" olan elanlar
 *    (son tarix elan mətnindən avtomatik çıxarılır).
 */
const AEF = "https://www.aef.gov.az";
const UNEC_CATEGORY = "/elan/87-musabigae";
const USER_AGENT = "Mozilla/5.0 (compatible; UNEC-GAS-Platforma/1.0)";

const SYNC_KEY = "grants.lastSync";
const LOCK_KEY = "grants.syncLock";
const PRUNED_KEY = "grants.pruned";
export const AUTO_SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000;
/** Vaxtı keçmiş qrantlardan neçəsi saxlanılır */
export const KEEP_PAST = 5;
/** Son tarixi bilinməyən qrant nəşrindən bu qədər gün "aktual" sayılır */
const UNKNOWN_DEADLINE_DAYS = 240;
const DAY = 864e5;

const AZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];

/** "19 Fevral 2026" → Date (Bakı vaxtı) */
function parseAzDate(s: string) {
  const m = s.trim().toLocaleLowerCase("az").match(/(\d{1,2})\s+(\p{L}+)\s+(\d{4})/u);
  if (!m) return null;
  const mi = AZ_MONTHS.findIndex((x) => m[2].startsWith(x));
  return mi < 0 ? null : new Date(Date.UTC(Number(m[3]), mi, Number(m[1]), -4));
}

// Yalnız aef.gov.az üçün: Node-un etibarlı kök siyahısı + çatışmayan aralıq sertifikat (aef-ca.ts)
let aefAgent: Agent | null = null;
const aefDispatcher = () => (aefAgent ??= new Agent({ connect: { ca: [...rootCertificates, SECTIGO_DV_R36] } }));

async function getAef(path: string) {
  const res = await undiciFetch(AEF + path, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "az" },
    signal: AbortSignal.timeout(15_000),
    dispatcher: aefDispatcher(),
  });
  if (!res.ok) throw new SourceError(`aef.gov.az cavab vermədi (HTTP ${res.status}).`, res.status === 403);
  return res.text();
}

const aefAbs = (u: string) => (u.startsWith("http") ? u.replace(/^http:\/\//, "https://") : AEF + (u.startsWith("/") ? u : `/${u}`));

/** Elm Fondu: cari qrant müsabiqələri */
async function syncAef(known: Set<string>, pruned: Set<string>, force: boolean) {
  const html = await getAef("/az/grant");
  let added = 0;
  let updated = 0;
  for (const block of html.split('<div class="news-list">').slice(1)) {
    const link = block.match(/href="\/az\/grant\/view\/(\d+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!link) continue;
    const id = `aef-${link[1]}`;
    if (pruned.has(id) || (!force && known.has(id))) continue;

    const publishedAt = parseAzDate(block.match(/<span class="date">([^<]+)<\/span>/)?.[1] ?? "") ?? new Date();
    const listImg = block.match(/<img[^>]+src="([^"]+)"/)?.[1];
    const detail = await getAef(`/az/grant/view/${link[1]}`);
    // Əsas məzmun: başlıq zolağından sonrakı blok, sosial düymələrə qədər
    const content = detail.match(/min-height:\s*460px;?">([\s\S]*?)<div id="social"/)?.[1] ?? "";
    const documents: GrantDocument[] = [...content.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
      .map((m) => ({ url: aefAbs(m[1]), title: text(m[2]) }))
      .filter((d) => d.title && /^https:\/\//.test(d.url));
    const image = content.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? listImg;

    await upsertGrant({
      id,
      source: "aef",
      sourceUrl: `${AEF}/az/grant/view/${link[1]}`,
      title: decodeHTML(text(link[2])),
      summary: "Azərbaycan Elm Fondunun qrant müsabiqəsi. Şərtlər, tələblər və son tarix müsabiqə elanında (sənədlər bölməsi).",
      bodyHtml: "",
      image: image ? aefAbs(image) : null,
      documents,
      publishedAt,
      deadline: null,
      amount: null,
      fields: [],
      fetchedAt: new Date(),
    });
    if (known.has(id)) updated++;
    else added++;
  }
  return { added, updated };
}

/** UNEC: "Müsabiqə" bölməsindən qrant elanları */
async function syncUnec(known: Set<string>, pruned: Set<string>, force: boolean) {
  let added = 0;
  let updated = 0;
  for (let page = 0; page < 2; page++) {
    const items = parseListing(await getUnec(`${UNEC_CATEGORY}?start=${page * 10}`), UNEC_CATEGORY).filter((i) =>
      /qrant|grant/i.test(i.title),
    );
    for (const item of items) {
      const id = `unec-${item.id}`;
      if (pruned.has(id) || (!force && known.has(id))) continue;
      const html = await getUnec(item.path);
      const title = text(html.match(/itemprop="headline"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? item.title) || item.title;
      const bodyRaw = html.match(/itemprop="articleBody">([\s\S]*?)<\/section>/)?.[1] ?? "";
      const plain = text(bodyRaw);
      const { deadline } = extractConference(title, plain, item.publishedAt);
      const documents: GrantDocument[] = [...bodyRaw.matchAll(/<a[^>]+href="([^"]+\.(?:pdf|docx?)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)]
        .map((m) => ({ url: absolute(m[1]), title: text(m[2]) || "Sənəd" }));

      await upsertGrant({
        id,
        source: "unec",
        sourceUrl: absolute(item.path),
        title,
        summary: plain.slice(0, 280),
        bodyHtml: cleanBody(bodyRaw),
        image: item.image,
        documents,
        publishedAt: item.publishedAt,
        deadline: deadline ? new Date(deadline) : null,
        amount: null,
        fields: [],
        fetchedAt: new Date(),
      });
      if (known.has(id)) updated++;
      else added++;
    }
  }
  return { added, updated };
}

export interface GrantSyncResult {
  added: number;
  updated: number;
  pruned: number;
  errors: string[];
  /** news.unec.edu.az bu serveri bloklayıb (Cloudflare) — UNEC qrantları üçün lokal skript lazımdır */
  unecBlocked?: boolean;
}

export function isCurrentGrant(g: Pick<Grant, "deadline" | "publishedAt">, now = Date.now()) {
  if (g.deadline) return Date.parse(g.deadline) > now;
  return now - Date.parse(g.publishedAt) < UNKNOWN_DEADLINE_DAYS * DAY;
}

/** Vaxtı keçmiş (avtomatik çəkilmiş) qrantlardan yalnız son KEEP_PAST-ı saxlanılır */
export async function pruneGrants() {
  const now = Date.now();
  const past = (await listGrants({ includeHidden: true }))
    .filter((g) => g.source !== "manual" && !isCurrentGrant(g, now))
    .sort((a, b) => Date.parse(b.deadline ?? b.publishedAt) - Date.parse(a.deadline ?? a.publishedAt));
  const remove = past.slice(KEEP_PAST).map((g) => g.id);
  if (!remove.length) return 0;
  await deleteGrants(remove);
  const pruned = (await getState<string[]>(PRUNED_KEY)) ?? [];
  await setState(PRUNED_KEY, [...new Set([...remove, ...pruned])].slice(0, 500));
  return remove.length;
}

export async function syncGrants({ force = false } = {}): Promise<GrantSyncResult> {
  const known = await listGrantIds();
  const pruned = new Set((await getState<string[]>(PRUNED_KEY)) ?? []);
  const result: GrantSyncResult = { added: 0, updated: 0, pruned: 0, errors: [] };

  // Mənbələr bir-birindən asılı deyil — biri alınmasa, digəri işləyir
  for (const [name, run] of [
    ["Elm Fondu", syncAef],
    ["UNEC", syncUnec],
  ] as const) {
    try {
      const r = await run(known, pruned, force);
      result.added += r.added;
      result.updated += r.updated;
    } catch (e) {
      result.errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
      if (name === "UNEC" && e instanceof SourceError && e.blocked) result.unecBlocked = true;
    }
  }
  result.pruned = await pruneGrants();
  await setState(SYNC_KEY, { at: new Date().toISOString(), ...result });
  return result;
}

export async function getLastGrantSync() {
  return getState<{ at: string } & GrantSyncResult>(SYNC_KEY);
}

export async function syncGrantsIfStale() {
  const last = await getLastGrantSync();
  if (last && Date.now() - Date.parse(last.at) < AUTO_SYNC_INTERVAL_MS) return;
  const lock = await getState<{ at: string }>(LOCK_KEY);
  if (lock && Date.now() - Date.parse(lock.at) < 5 * 60 * 1000) return;
  await setState(LOCK_KEY, { at: new Date().toISOString() });
  try {
    await syncGrants();
  } finally {
    await setState(LOCK_KEY, { at: new Date(0).toISOString() });
  }
}
