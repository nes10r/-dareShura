import type { Journal } from "../types";
import type { HijackedEntry } from "./hijacked";

/**
 * Jurnal üçün risk nişanları. Bunlar hökm deyil, yoxlamağa dəvətdir:
 * hər nişanın izahı və mənbəyi göstərilir.
 */

export interface RiskFlag {
  code: "hijacked" | "scopus-discontinued" | "apc-no-doaj" | "volume-surge";
  level: "high" | "warn";
  title: string;
  detail: string;
  links?: { label: string; href: string }[];
}

/** Qəfil artım: son tam ildə məqalə sayı 3 il əvvəlkindən ≥2,5 dəfə çox, ≥200 məqalə və istinad azdır */
const SURGE_RATIO = 2.5;
const SURGE_MIN = 200;
const LOW_CITEDNESS = 1.5;

export function surgeOf(j: Pick<Journal, "worksByYear">, year = new Date().getUTCFullYear()) {
  const by = j.worksByYear ?? {};
  const last = by[String(year - 1)] ?? 0;
  const before = by[String(year - 4)] ?? 0;
  return { last, before, lastYear: year - 1, baseYear: year - 4, ratio: before > 0 ? last / before : null };
}

export function hijackedFor(j: Pick<Journal, "issn" | "issnL">, list: HijackedEntry[]) {
  const mine = new Set([j.issnL, ...j.issn].filter(Boolean).map((x) => x!.toUpperCase()));
  return mine.size ? list.find((h) => h.issns.some((i) => mine.has(i))) : undefined;
}

export function riskFlags(j: Journal, hijacked?: HijackedEntry): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (hijacked) {
    flags.push({
      code: "hijacked",
      level: "high",
      title: "Bu jurnalın saxta (klon) saytı var",
      detail: `Retraction Watch siyahısına görə «${hijacked.title}» adından saxta sayt məqalə və ödəniş toplayır. Məqaləni yalnız rəsmi saytdan göndərin, linki ISSN üzrə yoxlayın.`,
      links: [
        ...(hijacked.officialUrl ? [{ label: "Rəsmi sayt", href: hijacked.officialUrl }] : j.homepage ? [{ label: "Rəsmi sayt (OpenAlex)", href: j.homepage }] : []),
        { label: "Retraction Watch", href: "https://retractionwatch.com/the-retraction-watch-hijacked-journal-checker/" },
      ],
    });
  }

  if (j.scopus?.indexed && j.scopus.discontinuedAfter) {
    flags.push({
      code: "scopus-discontinued",
      level: "high",
      title: `Scopus-dan çıxarılıb (${j.scopus.discontinuedAfter})`,
      detail: "Scopus jurnalı keyfiyyət meyarlarına görə əhatədən çıxarıb. Bundan sonrakı məqalələr Scopus-da görünmür və adətən attestasiyada sayılmır.",
      links: j.scopus.sourceUrl ? [{ label: "Scopus", href: j.scopus.sourceUrl }] : undefined,
    });
  }

  if (j.isOa && (j.apcUsd ?? 0) > 0 && !j.inDoaj) {
    flags.push({
      code: "apc-no-doaj",
      level: "warn",
      title: "Nəşr haqqı alır, amma DOAJ-da deyil",
      detail: "Etibarlı ödənişli açıq giriş jurnallarının əksəriyyəti DOAJ-a daxildir. Ödəniş etməzdən əvvəl rəy prosesini, redaksiya heyətini və indeksləri yoxlayın.",
      links: [{ label: "DOAJ-da yoxla", href: `https://doaj.org/search/journals?source=${encodeURIComponent(JSON.stringify({ query: { query_string: { query: j.issnL ?? j.title } } }))}` }],
    });
  }

  const s = surgeOf(j);
  if (s.ratio != null && s.ratio >= SURGE_RATIO && s.last >= SURGE_MIN && (j.meanCitedness ?? 0) < LOW_CITEDNESS) {
    flags.push({
      code: "volume-surge",
      level: "warn",
      title: `Məqalə sayı ${s.ratio.toFixed(1).replace(".", ",")} dəfə artıb, istinad azdır`,
      detail: `${s.baseYear}-də ${s.before}, ${s.lastYear}-də ${s.last} məqalə; 2 illik orta istinad ${String(j.meanCitedness ?? 0).replace(".", ",")}. Qəfil artım və az istinad zəif rəy prosesinin əlaməti ola bilər.`,
    });
  }

  return flags;
}
