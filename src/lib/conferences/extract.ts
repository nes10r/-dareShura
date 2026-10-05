/**
 * news.unec.edu.az konfrans elanlarının sərbəst mətnindən strukturlaşdırılmış məlumat çıxarır:
 * keçirilmə tarixi, son müraciət tarixi (deadline), format, məkan, ödəniş.
 *
 * Qaydalar real elanların yazılış nümunələri əsasında qurulub. Avtomatik nəticə səhv ola bilər —
 * admin hər sahəni əl ilə düzəldə bilir (düzəlişlər yenidən sinxronizasiyada üzərinə yazılmır).
 */

import type { ConferenceFee, ConferenceFormat } from "../types";

export type { ConferenceFee, ConferenceFormat };

export interface ExtractedConference {
  startsAt: string | null;
  endsAt: string | null;
  deadline: string | null;
  deadlines: { date: string; label: string }[];
  format: ConferenceFormat | null;
  location: string | null;
  fee: ConferenceFee | null;
  feeNote: string | null;
}

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const MONTH_RE = MONTHS.join("|");
const L = "\\p{L}";

const lower = (s: string) => s.toLocaleLowerCase("az");
const monthIndex = (m: string) => MONTHS.findIndex((x) => lower(m).startsWith(x));

/** Bakı vaxtı ilə günün sonu (deadline) və ya başlanğıcı (tədbir) */
function bakuDate(year: number, month: number, day: number, endOfDay = false) {
  const d = new Date(Date.UTC(year, month, day, endOfDay ? 23 - 4 : 0 - 4, endOfDay ? 59 : 0));
  return Number.isNaN(d.getTime()) || day < 1 || day > 31 ? null : d;
}

interface DateHit {
  start: Date;
  end: Date;
  index: number;
  length: number;
  ignored?: boolean;
}

/** Mətndəki bütün tarixlər (tək tarix və aralıqlar) */
function findDates(text: string, fallbackYear: number): DateHit[] {
  const hits: DateHit[] = [];
  const add = (index: number, length: number, y: number, m1: number, d1: number, m2: number, d2: number) => {
    const start = bakuDate(y, m1, d1);
    const end = bakuDate(y, m2, d2, true);
    if (start && end && end >= start) hits.push({ start, end, index, length });
  };

  // "15-16 oktyabr 2026", "01 aprel – 25 aprel 2026", "30 sentyabr - 2 oktyabr 2026", "15 oktyabr 2026"
  const re = new RegExp(
    `(\\d{1,2})(?:\\s+(${MONTH_RE})${L}*)?\\s*(?:[-–—]\\s*(\\d{1,2})\\s+)?(?:(${MONTH_RE})${L}*)(?:\\s+(\\d{4}))?`,
    "giu",
  );
  for (const m of text.matchAll(re)) {
    const [, d1, mon1, d2, mon2, y] = m;
    const endMonth = monthIndex(mon2);
    const startMonth = mon1 ? monthIndex(mon1) : endMonth;
    const year = y ? Number(y) : fallbackYear;
    if (d2) add(m.index!, m[0].length, year, startMonth, Number(d1), endMonth, Number(d2));
    else add(m.index!, m[0].length, year, endMonth, Number(d1), endMonth, Number(d1));
  }

  // "Aprelin 24-də", "Mayın 8-də"
  const gen = new RegExp(`(${MONTH_RE})(?:ın|in|un|ün)\\s+(\\d{1,2})-?(?:də|da|i|ı|u|ü)?`, "giu");
  for (const m of text.matchAll(gen)) {
    const mi = monthIndex(m[1]);
    add(m.index!, m[0].length, fallbackYear, mi, Number(m[2]), mi, Number(m[2]));
  }

  // "15.10.2026"
  for (const m of text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/g)) {
    add(m.index!, m[0].length, Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[2]) - 1, Number(m[1]));
  }

  return hits.sort((a, b) => a.index - b.index);
}

const DEADLINE_AFTER = /^[^.;\n]{0,25}?(tarixinədək|tarixədək|tarixinə qədər|qədər|\sdək|-dək|-dak)|^[^;:\d]{0,90}?son tarix(?!i?\s*:)/iu;
/** "22 dekabr 2025-ci il tarixli Sərəncam" — sənəd tarixi, tədbir deyil */
const DOCUMENT_DATE = /^[^.;\n]{0,20}?tarixli(?=[\s.,;]|$)/iu;
const DEADLINE_BEFORE = /(son tarix|son müddət|deadline|göndərilmə|təqdim\w*|qəbulu|qeydiyyat\w*|müraciət\w*)[^.;\n]{0,40}$/iu;
const EVENT_NEAR = /^[\s\-–]*(?:\d{4}[-\s]?(?:cı|ci|cu|cü)?\s*il\s*)?(tarixlərində|tarixində|keçiril)/iu;

function deadlineLabel(before: string) {
  const b = lower(before);
  if (/xülasə|tezis/.test(b)) return "Tezis/xülasə";
  if (/məqalə|tam mətn/.test(b)) return "Məqalə";
  if (/qeydiyyat|ödəniş/.test(b)) return "Qeydiyyat";
  if (/müraciət/.test(b)) return "Müraciət";
  return "Son tarix";
}

function extractDates(text: string, publishedAt: Date) {
  const year = publishedAt.getUTCFullYear();
  const hits = findDates(text, year).map((h) => {
    // İl göstərilməyibsə və tarix nəşrdən xeyli əvvəldirsə — növbəti il
    if (h.end.getTime() < publishedAt.getTime() - 60 * 864e5 && !/\d{4}/.test(text.slice(h.index, h.index + h.length))) {
      h.start.setUTCFullYear(h.start.getUTCFullYear() + 1);
      h.end.setUTCFullYear(h.end.getUTCFullYear() + 1);
    }
    return h;
  });

  let event: DateHit | null = null;
  const deadlines: { date: Date; label: string }[] = [];

  for (const h of hits) {
    const after = text.slice(h.index + h.length, h.index + h.length + 90);
    const before = text.slice(Math.max(0, h.index - 70), h.index);
    if (DOCUMENT_DATE.test(after)) {
      h.ignored = true;
      continue;
    }
    if (EVENT_NEAR.test(after)) {
      event ??= h;
    } else if (DEADLINE_AFTER.test(after) || DEADLINE_BEFORE.test(before)) {
      deadlines.push({ date: h.end, label: deadlineLabel(before + " " + after.slice(0, 30)) });
    } else if (/keçirilməsi|tarix:\s*$/iu.test(before + after.slice(0, 25))) {
      event ??= h;
    }
  }
  // Açıq işarə yoxdursa — müraciət tarixi olmayan ilk tarix tədbirin tarixidir
  event ??= hits.find((h) => !h.ignored && !deadlines.some((d) => d.date.getTime() === h.end.getTime())) ?? null;

  // Tədbirdən sonrakı "son tarix"lər (məs. nəşr üçün) əsas deadline sayılmır
  const relevant = deadlines.filter((d) => !event || d.date.getTime() <= event.end.getTime()).sort((a, b) => a.date.getTime() - b.date.getTime());
  const now = Date.now();
  const main = relevant.find((d) => d.date.getTime() >= now) ?? relevant.at(-1) ?? null;

  return {
    startsAt: event?.start.toISOString() ?? null,
    endsAt: event?.end.toISOString() ?? null,
    deadline: main?.date.toISOString() ?? null,
    deadlines: relevant.map((d) => ({ date: d.date.toISOString(), label: d.label })),
  };
}

function extractFormat(text: string): ConferenceFormat | null {
  const t = lower(text);
  if (/hibrid|hybrid|qarışıq formatda/.test(t)) return "Hibrid";
  const FORMAT_WORD = "(formatda|formada|rejimdə|şəkildə|formatlı|formatında)";
  const online = new RegExp(`(onlayn|online|virtual|distant|məsafədən)[^.]{0,25}?${FORMAT_WORD}|zoom|vebinar|webinar`).test(t);
  const inPerson = new RegExp(`(əyani|ənənəvi|oflayn|offline|üz-üzə|in-person)[^.]{0,25}?${FORMAT_WORD}|\\(əyani\\)`).test(t)
    || /(onlayn|online)\s+və\s+(əyani|oflayn)|(əyani|oflayn)\s+və\s+(onlayn|online)/.test(t);
  if (/(onlayn|online)\s+və\s+(əyani|oflayn)|(əyani|oflayn)\s+və\s+(onlayn|online)/.test(t)) return "Hibrid";
  if (online && inPerson) return "Hibrid";
  if (online) return "Onlayn";
  if (inPerson) return "Əyani";
  return null;
}

function extractFee(text: string): { fee: ConferenceFee | null; feeNote: string | null } {
  const t = lower(text);
  const amount = text.match(/(\d[\d\s.,]*)\s?(AZN|manat|USD|EUR|dollar|avro|TL|\$|€)/iu);
  const free = /ödənişsiz|pulsuz|haqqı\s+(tələb olunmur|alınmır|yoxdur)|ödəniş tələb olunmur|free of charge|no (registration )?fee/.test(t);
  const paid = /(iştirak|qeydiyyat|nəşr|registration)\s+(haqqı|fee)|ödənişli|ödəniş üçün|ödənişin/.test(t) || !!amount;
  if (paid && !free) return { fee: "paid", feeNote: amount ? `${amount[1].trim()} ${amount[2]}` : null };
  if (free) return { fee: "free", feeNote: null };
  return { fee: null, feeNote: null };
}

// ---------- Məkan ----------

const VENUE_WORD = "(?:Universitet|Akademiya|İnstitut|İnstut|Kitabxana|Mərkəz|Kollec|Nazirliy)";
const CAP = "[A-ZƏÖÜŞÇĞİIQ][\\p{L}’'\\-]*";

const COUNTRIES: Record<string, string> = {
  türkiyə: "Türkiyə", özbəkistan: "Özbəkistan", qazaxıstan: "Qazaxıstan", gürcüstan: "Gürcüstan", rusiya: "Rusiya",
  türkmənistan: "Türkmənistan", qırğızıstan: "Qırğızıstan", almaniya: "Almaniya", polşa: "Polşa", italiya: "İtaliya",
  macarıstan: "Macarıstan", ukrayna: "Ukrayna", çin: "Çin", "bəə": "BƏƏ",
};

/** "Universitetində" → "Universiteti", "Akademiyasında" → "Akademiyası", "Bakıda" → "Bakı" */
function nominative(phrase: string) {
  return phrase
    .replace(/(Universitet|İnstitut|İnstut)(?:in|ın|un|ün)(?:də|da|in|ın|ə|a)?$/u, (_m, w) => `${w === "İnstut" ? "İnstitut" : w}u`.replace(/Universitetu$/, "Universiteti"))
    .replace(/(Akademiya|Kitabxana)(?:sında|sının|sına)$/u, "$1sı")
    .replace(/Mərkəz(?:ində|inin|inə)$/u, "Mərkəzi")
    .replace(/Kollec(?:ində|inin)$/u, "Kolleci")
    .replace(/^\S+ Respublikası(?:nın)?\s+/u, "");
}

function findVenue(text: string) {
  const re = new RegExp(`((?:(?:${CAP}|adına|və)\\s+){0,7}${VENUE_WORD}\\p{L}*)(?:\\s*\\(([A-ZƏÖÜŞÇĞİ]{2,8})\\))?`, "gu");
  let best: { name: string; score: number } | null = null;
  for (const m of text.matchAll(re)) {
    let raw = m[1].trim().replace(/^(və|adına)\s+/u, "");
    // Başda kiçik hərfli söz qalmasın
    // Kiçik hərfli sözlər və mənbədəki bəzək baş hərfi ("A Azərbaycan ...") atılır
    raw = raw.replace(/^(?:[a-zəöüşçğı]\S*\s+)+/u, "").replace(/^(?:\S\s+)+/u, "");
    // "X Agentliyi və Y Universiteti" — qurumlar siyahısından yalnız sonuncu (yer bildirən).
    // "Neft və Sənaye Universiteti" kimi adlar bölünmür: "və"-dən əvvəlki hissə özü qurumla bitməlidir.
    const parts = raw.split(/\svə\s/u);
    for (let i = parts.length - 1; i > 0; i--) {
      if (/(Agentliy|Nazirliy|Universitet|Akademiya|İnstitut|Komitə|Xidmət|Mərkəz)\p{L}*$/u.test(parts[i - 1])) {
        raw = parts.slice(i).join(" və ");
        break;
      }
    }
    if (raw.split(/\s+/).length < 2 && !m[2]) continue;
    const after = text.slice(m.index! + m[0].length, m.index! + m[0].length + 30);
    // Yer bildirən hal (…Universitetində) və ya "ev sahibliyi / birgə təşkilatçılığı ilə" — tədbirin keçirildiyi yer
    const locative = /(ndə|nda|sında|sində)$/u.test(m[1]) || /ev sahibliyi|təşkilatçılığı ilə/u.test(after);
    const organizer = /^\s*(\([^)]*\)\s*)?tərəfindən/u.test(after);
    const score = (locative ? 3 : 0) - (organizer ? 2 : 0) - m.index! / 5000;
    const name = nominative(raw) + (m[2] ? ` (${m[2]})` : "");
    if (!best || score > best.score) best = { name, score };
  }
  return best && best.score > 0 ? best.name : null;
}

function findCity(text: string) {
  const m = text.match(new RegExp(`(${CAP})\\s+şəhərində`, "u"));
  if (m) return m[1].replace(/(nın|nin|nun|nün)$/u, "");
  // "Türkiyədə (Düzce)"
  const c = text.match(/(Türkiyə|Özbəkistan|Qazaxıstan|Gürcüstan|Rusiya)(?:də|da)\s*\(([^)]{2,25})\)/u);
  if (c) return `${c[2]}, ${c[1]}`;
  return null;
}

function findCountry(text: string) {
  const m = lower(text).match(/(türkiyə|özbəkistan|qazaxıstan|gürcüstan|rusiya|türkmənistan|qırğızıstan|almaniya|polşa|italiya|macarıstan|ukrayna|çin)(?:nin|nın|nun|nün|də|da|\s+respublikası)(?=[\s.,;:)]|$)/u);
  return m ? COUNTRIES[m[1]] : null;
}

/** Başlığın əvvəlindəki yer: "SDU-da ...", "İstanbulda ...", "Naxçıvan Dövlət Universitetində ..." */
function venueFromTitle(title: string) {
  const v = findVenue(title);
  if (v) return v;
  const m = title.match(new RegExp(`^(${CAP}(?:\\s+${CAP})*?)-?(da|də|nda|ndə)\\s`, "u"));
  return m ? m[1] : null;
}

function extractLocation(title: string, text: string, format: ConferenceFormat | null) {
  const explicit = text.match(/Məkan:\s*([^.\n]{3,90}?)(?=\s{2,}|\s+Tarix:|\.|$)/u);
  if (explicit) return explicit[1].trim().replace(/,\s*$/, "");

  const head = text.slice(0, 900);
  const venue = findVenue(head) ?? venueFromTitle(title);
  const city = findCity(head);
  const country = findCountry(head);

  const parts: string[] = [];
  if (venue) parts.push(venue);
  if (city && !parts.some((p) => p.includes(city.split(",")[0]))) parts.push(city);
  if (country && !parts.some((p) => p.includes(country)) && country !== "Azərbaycan") parts.push(country);
  if (parts.length) return parts.join(", ");
  return format === "Onlayn" ? "Onlayn" : null;
}

export function extractConference(title: string, text: string, publishedAt: Date): ExtractedConference {
  const clean = text.replace(/\s+/g, " ").trim();
  const format = extractFormat(clean);
  return {
    ...extractDates(clean, publishedAt),
    format,
    location: extractLocation(title.trim(), clean, format),
    ...extractFee(clean),
  };
}
