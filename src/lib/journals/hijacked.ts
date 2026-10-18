import { inflateRawSync } from "node:zlib";
import { getState, setState } from "../db/repo";

/**
 * Retraction Watch Hijacked Journal Checker — saxta (klon) saytı olan jurnallar.
 * Açıq Google Sheets cədvəli xlsx kimi yüklənir; həftədə bir dəfə yenilənir və bazada saxlanılır.
 * https://retractionwatch.com/the-retraction-watch-hijacked-journal-checker/
 */

export const HIJACKED_SOURCE = "https://retractionwatch.com/the-retraction-watch-hijacked-journal-checker/";
const XLSX_URL = "https://docs.google.com/spreadsheets/d/1ak985WGOgGbJRJbZFanoktAN_UFeExpE/export?format=xlsx";
const STATE_KEY = "hijacked_journals";
const TTL = 7 * 86_400_000;

export interface HijackedEntry {
  title: string;
  /** Saxta saytlar */
  fakeUrls: string[];
  /** Rəsmi sayt (məlumdursa) */
  officialUrl: string | null;
  issns: string[];
}

interface HijackedState {
  syncedAt: string;
  items: HijackedEntry[];
}

/** Minimal ZIP oxuyucu: xlsx daxilindəki bir faylı çıxarır (deflate və ya saxlanmış) */
function unzipEntry(buf: Buffer, name: string): string | null {
  // Mərkəzi kataloqun sonu
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) return null;
  let p = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const entry = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (entry === name) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      return (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

const xmlText = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();

/** Cədvəl sətirləri: { A: "...", B: "...", ... } (xətti oxunuş — böyük fayllarda regex geri izləməsi olmadan) */
function readRows(xlsx: Buffer): Record<string, string>[] {
  const sharedXml = unzipEntry(xlsx, "xl/sharedStrings.xml") ?? "";
  const shared = sharedXml.split("<si>").slice(1).map((x) => xmlText(x.split("</si>")[0]));
  const sheet = unzipEntry(xlsx, "xl/worksheets/sheet1.xml") ?? "";
  const rows: Record<string, string>[] = [];
  for (const chunk of sheet.split("<row").slice(1)) {
    const body = chunk.split("</row>")[0];
    const r: Record<string, string> = {};
    for (const cell of body.split("<c ").slice(1)) {
      const head = cell.slice(0, cell.indexOf(">") + 1);
      const col = head.match(/r="([A-Z]+)\d+"/)?.[1];
      if (!col || head.endsWith("/>")) continue;
      const type = head.match(/t="(\w+)"/)?.[1];
      const inner = cell.slice(head.length).split("</c>")[0];
      const v = inner.includes("<v>") ? inner.split("<v>")[1].split("</v>")[0] : null;
      const val = type === "s" && v != null ? shared[Number(v)] : type === "inlineStr" ? xmlText(inner) : v != null ? xmlText(v) : "";
      if (val) r[col] = val;
    }
    if (Object.keys(r).length) rows.push(r);
  }
  return rows;
}

const ISSN_RE = /\b\d{4}-?\d{3}[\dXx]\b/g;
const issnsIn = (s: string | undefined) => (s?.match(ISSN_RE) ?? []).map((x) => (x.includes("-") ? x : `${x.slice(0, 4)}-${x.slice(4)}`).toUpperCase());
const urlsIn = (s: string | undefined) => s?.match(/https?:\/\/[^\s,;]+/g) ?? [];

/**
 * Sütunlar başlıq sətrindən tapılır: "Hijacked Journal Title", "URL (Hijacked)", "ISSN (Hijacked)",
 * "ISSN (Original)", "URL (Original Journal)". Başlıqsız davam sətirləri əvvəlki jurnala aiddir.
 */
export function parseHijacked(xlsx: Buffer): HijackedEntry[] {
  const rows = readRows(xlsx);
  const headerIdx = rows.findIndex((r) => Object.values(r).some((v) => /hijacked journal title/i.test(v)));
  if (headerIdx < 0) return [];
  const h = rows[headerIdx];
  const colOf = (re: RegExp) => Object.keys(h).find((k) => re.test(h[k])) ?? "";
  const cTitle = colOf(/journal title/i);
  const cFake = colOf(/url\s*\(hijacked\)/i);
  const cFakeIssn = colOf(/issn\s*\(hijacked\)/i);
  const cIssn = colOf(/issn\s*\(original\)/i);
  const cUrl = colOf(/url\s*\(original/i);

  const out: HijackedEntry[] = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const title = r[cTitle]?.trim();
    const fake = urlsIn(r[cFake]);
    const issns = [...issnsIn(r[cIssn]), ...issnsIn(r[cFakeIssn])];
    const official = urlsIn(r[cUrl])[0] ?? null;
    const last = out[out.length - 1];
    if (!title && last) {
      last.fakeUrls.push(...fake);
      last.issns.push(...issns);
      last.officialUrl ??= official;
      continue;
    }
    if (!title) continue;
    out.push({ title, fakeUrls: fake, officialUrl: official, issns });
  }
  // Eyni jurnalın bir neçə saxta saytı ayrı sətirlərdə ola bilər — birləşdiririk
  const merged = new Map<string, HijackedEntry>();
  for (const e of out) {
    const k = e.title.toLowerCase();
    const m = merged.get(k);
    if (m) {
      m.fakeUrls.push(...e.fakeUrls);
      m.issns.push(...e.issns);
      m.officialUrl ??= e.officialUrl;
    } else merged.set(k, { ...e, fakeUrls: [...e.fakeUrls], issns: [...e.issns] });
  }
  return [...merged.values()]
    .map((e) => ({ ...e, fakeUrls: [...new Set(e.fakeUrls)].slice(0, 5), issns: [...new Set(e.issns)] }))
    .filter((e) => e.issns.length || e.fakeUrls.length);
}

/** Siyahı köhnədirsə (7 gün) yenilə; mənbə əlçatmazdırsa köhnə siyahı ilə davam et */
export async function getHijackedList(): Promise<HijackedEntry[]> {
  const state = await getState<HijackedState>(STATE_KEY);
  if (state && Date.now() - Date.parse(state.syncedAt) < TTL) return state.items;
  try {
    const res = await fetch(XLSX_URL, { signal: AbortSignal.timeout(15_000), cache: "no-store", headers: { "User-Agent": "UNEC-GAS-Platforma/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseHijacked(Buffer.from(await res.arrayBuffer()));
    if (items.length < 50) throw new Error(`gözlənilməz format (${items.length} sətir)`);
    await setState(STATE_KEY, { syncedAt: new Date().toISOString(), items } satisfies HijackedState);
    return items;
  } catch (e) {
    console.error("[jurnallar] saxta jurnallar siyahısı:", e instanceof Error ? e.message : e);
    return state?.items ?? [];
  }
}
