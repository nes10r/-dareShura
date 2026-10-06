import { decodeHTML } from "entities";
import sanitizeHtml from "sanitize-html";
import { deleteConferences, getState, listConferenceIds, listConferences, setState, upsertConference } from "../db/repo";
import { extractConference } from "./extract";
import { isCurrent } from "./view";

/**
 * news.unec.edu.az → "Konfrans" bölməsinin elanlarını oxuyur və bazaya yazır.
 * Mənbə Joomla saytıdır: siyahı səhifəsində 10 elan, ?start=10, 20 ... ilə səhifələnir.
 */
const ORIGIN = "https://news.unec.edu.az";
const CATEGORY_PATH = "/elan/86-konfrans";
const USER_AGENT = "Mozilla/5.0 (compatible; UNEC-GAS-Platforma/1.0)";

/** Bir sinxronizasiyada ən çox neçə siyahı səhifəsi və yeni elan oxunur (Vercel funksiya vaxtı məhduddur) */
const MAX_PAGES = 3;
const MAX_NEW_ARTICLES = 12;
/** Mənbəyə eyni anda ən çox neçə sorğu */
const CONCURRENCY = 4;
/** Nəşrindən bu qədər əvvəlki elanlar götürülmür */
const MAX_AGE_DAYS = 365;

const SYNC_KEY = "conferences.lastSync";
/** Silinmiş (köhnəlmiş) elanların nömrələri — yenilənmədə yenidən əlavə olunmasın */
const PRUNED_KEY = "conferences.pruned";
/** Vaxtı bitmiş konfranslardan neçəsi saxlanılır (ən son keçirilənlər) */
export const KEEP_PAST = 5;
const LOCK_KEY = "conferences.syncLock";
/** Avtomatik (səhifəyə daxil olanda) yenilənmə intervalı */
export const AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function get(path: string) {
  const res = await fetch(ORIGIN + path, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "az" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) {
    const blocked = res.status === 403 && (res.headers.get("server") ?? "").toLowerCase().includes("cloudflare");
    throw new SourceError(
      blocked
        ? "news.unec.edu.az Cloudflare qoruması bu serverdən gələn sorğunu blokladı (HTTP 403)."
        : `news.unec.edu.az cavab vermədi (HTTP ${res.status}).`,
      blocked,
    );
  }
  return res.text();
}

/** Mənbəyə müraciət xətası; `blocked` — Cloudflare bot qoruması (server IP-si bloklanıb) */
export class SourceError extends Error {
  constructor(
    message: string,
    public blocked = false,
  ) {
    super(message);
  }
}

const text = (html: string) =>
  decodeHTML(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    // Mənbədə mətnin əvvəlində bəzək baş hərfi ("A ...") qalır
    .replace(/^[A-ZƏ]\s+(?=[A-ZƏÖÜŞÇĞİ0-9“"])/u, "")
    .trim();

const absolute = (url: string) => (url.startsWith("http") ? url : ORIGIN + (url.startsWith("/") ? url : `/${url}`));

interface ListingItem {
  id: string;
  path: string;
  title: string;
  image: string | null;
  publishedAt: Date;
}

function parseListing(html: string): ListingItem[] {
  const items: ListingItem[] = [];
  for (const block of html.split(/<article\b/).slice(1)) {
    const link = block.match(/href="(\/elan\/86-konfrans\/(\d+)-[^"?#]+)"/);
    const date = block.match(/datetime="([^"]+)"/);
    if (!link || !date) continue;
    const img = block.match(/<img[^>]+src="([^"]+)"/);
    const title = block.match(/<img[^>]+title="([^"]+)"/)?.[1] ?? block.match(/itemprop="url"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "";
    items.push({
      id: link[2],
      path: link[1],
      title: text(title),
      image: img ? absolute(img[1]) : null,
      publishedAt: new Date(date[1]),
    });
  }
  return items;
}

/** Mənbə HTML-i: yalnız təhlükəsiz teqlər, linklər və şəkillər mütləq URL-ə çevrilir. */
function cleanBody(html: string) {
  return sanitizeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, ""), {
    // Şəkil səhifədə ayrıca göstərilir — mətndən (qalereyadan) çıxarılır
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h2", "h3", "h4", "blockquote"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs.href
          ? { href: absolute(attribs.href), target: "_blank", rel: "noopener noreferrer nofollow" }
          : ({} as Record<string, string>),
      }),
      h4: "h3",
    },
    exclusiveFilter: (frame) =>
      // Qalereya naviqasiyasının boş/linksiz <a> qalıqları
      (frame.tag === "a" && (!frame.attribs.href || !frame.text.trim())) ||
      (["i", "em", "strong", "b"].includes(frame.tag) && !frame.text.trim()) ||
      // Boş abzaslar və e-poçtu gizlədən skript qalıqları
      (frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length) ||
      /spambotlardan qorunur/.test(frame.text),
  }).trim();
}

async function fetchArticle(item: ListingItem) {
  const html = await get(item.path);
  const title = text(html.match(/itemprop="headline"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? item.title) || item.title;
  const bodyRaw = html.match(/itemprop="articleBody">([\s\S]*?)<\/section>/)?.[1] ?? "";
  const plain = text(bodyRaw);
  const extracted = extractConference(title, plain, item.publishedAt);
  const gallery = bodyRaw.match(/<img[^>]+src="([^"]+)"/)?.[1];

  await upsertConference({
    id: item.id,
    sourceUrl: ORIGIN + item.path,
    title,
    summary: plain.slice(0, 280),
    bodyHtml: cleanBody(bodyRaw),
    image: gallery ? absolute(gallery) : item.image,
    publishedAt: item.publishedAt,
    startsAt: extracted.startsAt ? new Date(extracted.startsAt) : null,
    endsAt: extracted.endsAt ? new Date(extracted.endsAt) : null,
    deadline: extracted.deadline ? new Date(extracted.deadline) : null,
    deadlines: extracted.deadlines,
    format: extracted.format,
    location: extracted.location,
    fee: extracted.fee,
    feeNote: extracted.feeNote,
    fetchedAt: new Date(),
  });
}

export interface SyncResult {
  checked: number;
  added: number;
  updated: number;
  /** Bu dəfə vaxt çatmadığı üçün növbəti yenilənməyə qalan elanlar */
  remaining?: number;
  /** Silinən köhnə konfransların sayı */
  pruned?: number;
  /** Mənbə bu serveri bloklayıb (Cloudflare) */
  blocked?: boolean;
  errors: string[];
}

/**
 * Yeni elanları çəkir. `force` — mövcud elanları da yenidən oxuyur (mətndə düzəliş olubsa).
 * Adminin əl ilə etdiyi düzəlişlər (overrides) heç vaxt silinmir.
 */
export async function syncConferences({ force = false, limit = MAX_NEW_ARTICLES } = {}): Promise<SyncResult> {
  const known = await listConferenceIds();
  const pruned = new Set((await getState<string[]>(PRUNED_KEY)) ?? []);
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const result: SyncResult = { checked: 0, added: 0, updated: 0, remaining: 0, errors: [] };
  const queue: ListingItem[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    let items: ListingItem[];
    try {
      items = parseListing(await get(`${CATEGORY_PATH}?start=${page * 10}`));
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
      result.blocked = e instanceof SourceError && e.blocked;
      break;
    }
    result.checked += items.length;
    const recent = items.filter((i) => i.publishedAt.getTime() >= cutoff);
    const fresh = recent.filter((i) => !pruned.has(i.id));
    queue.push(...fresh.filter((i) => force || !known.has(i.id)));
    // Səhifədə köhnə elan başlayıbsa və ya (adi yoxlamada) hamısı artıq məlumdursa, növbəti səhifəyə ehtiyac yoxdur
    if (!items.length || recent.length < items.length || (!force && fresh.every((i) => known.has(i.id)))) break;
  }

  // Paralel, amma mənbəni yükləməmək üçün məhdud sayda
  const batch = queue.slice(0, limit);
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    await Promise.all(
      batch.slice(i, i + CONCURRENCY).map(async (item) => {
        try {
          await fetchArticle(item);
          if (known.has(item.id)) result.updated++;
          else result.added++;
        } catch (e) {
          result.errors.push(`${item.id}: ${String(e)}`);
        }
      }),
    );
  }
  result.remaining = Math.max(0, queue.length - batch.length);
  result.pruned = await pruneConferences();

  await setState(SYNC_KEY, { at: new Date().toISOString(), ...result });
  return result;
}

/**
 * Vaxtı bitmiş konfranslardan yalnız ən son keçirilən KEEP_PAST qədərini saxlayır, qalanını silir.
 * Silinənlərin nömrələri yadda saxlanılır ki, mənbədə hələ olsalar da yenidən çəkilməsinlər.
 */
export async function pruneConferences() {
  const now = Date.now();
  const past = (await listConferences({ includeHidden: true }))
    .filter((c) => !isCurrent(c, now))
    .sort((a, b) => Date.parse(b.endsAt ?? b.startsAt ?? b.publishedAt) - Date.parse(a.endsAt ?? a.startsAt ?? a.publishedAt));
  const remove = past.slice(KEEP_PAST).map((c) => c.id);
  if (!remove.length) return 0;

  await deleteConferences(remove);
  const pruned = (await getState<string[]>(PRUNED_KEY)) ?? [];
  // Mənbə yalnız son ~1 ilin elanlarını göstərir — siyahı böyüməsin
  await setState(PRUNED_KEY, [...new Set([...remove, ...pruned])].slice(0, 500));
  return remove.length;
}

export async function getLastSync() {
  return getState<{ at: string } & SyncResult>(SYNC_KEY);
}

/**
 * Son yenilənmədən 6 saat keçibsə, fonda yenilə (səhifə gözləmir).
 * Eyni anda bir neçə sorğunun paralel sinxronizasiya etməməsi üçün sadə kilid.
 */
export async function syncIfStale() {
  const last = await getLastSync();
  if (last && Date.now() - Date.parse(last.at) < AUTO_SYNC_INTERVAL_MS) return;
  const lock = await getState<{ at: string }>(LOCK_KEY);
  if (lock && Date.now() - Date.parse(lock.at) < 5 * 60 * 1000) return;
  await setState(LOCK_KEY, { at: new Date().toISOString() });
  try {
    await syncConferences();
  } finally {
    await setState(LOCK_KEY, { at: new Date(0).toISOString() });
  }
}
