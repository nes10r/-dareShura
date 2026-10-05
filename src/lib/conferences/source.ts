import { decodeHTML } from "entities";
import sanitizeHtml from "sanitize-html";
import { getState, listConferenceIds, setState, upsertConference } from "../db/repo";
import { extractConference } from "./extract";

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
const LOCK_KEY = "conferences.syncLock";
/** Avtomatik (səhifəyə daxil olanda) yenilənmə intervalı */
export const AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function get(path: string) {
  const res = await fetch(ORIGIN + path, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "az" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
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
  errors: string[];
}

/**
 * Yeni elanları çəkir. `force` — mövcud elanları da yenidən oxuyur (mətndə düzəliş olubsa).
 * Adminin əl ilə etdiyi düzəlişlər (overrides) heç vaxt silinmir.
 */
export async function syncConferences({ force = false, limit = MAX_NEW_ARTICLES } = {}): Promise<SyncResult> {
  const known = await listConferenceIds();
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const result: SyncResult = { checked: 0, added: 0, updated: 0, remaining: 0, errors: [] };
  const queue: ListingItem[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    let items: ListingItem[];
    try {
      items = parseListing(await get(`${CATEGORY_PATH}?start=${page * 10}`));
    } catch (e) {
      result.errors.push(String(e));
      break;
    }
    result.checked += items.length;
    const fresh = items.filter((i) => i.publishedAt.getTime() >= cutoff);
    queue.push(...fresh.filter((i) => force || !known.has(i.id)));
    // Səhifədə artıq hamısı məlumdursa və ya köhnədirsə, növbəti səhifəyə ehtiyac yoxdur
    if (!items.length || fresh.length < items.length || (!force && fresh.every((i) => known.has(i.id)))) break;
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

  await setState(SYNC_KEY, { at: new Date().toISOString(), ...result });
  return result;
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
