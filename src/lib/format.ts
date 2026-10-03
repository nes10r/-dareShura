const TZ = "Asia/Baku";

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("az", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("az", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ,
  }).format(new Date(iso));
}

export function daysLeftLabel(days: number | null) {
  if (days === null) return null;
  if (days === 0) return "Bu gün bitir";
  return `${days} gün qalıb`;
}

export function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}


const AZ_MAP: Record<string, string> = { ə: "e", ı: "i", i̇: "i", ö: "o", ü: "u", ş: "s", ç: "c", ğ: "g" };

/** URL üçün slug: Azərbaycan hərfləri latın ASCII-yə çevrilir. */
export function slugify(text: string) {
  return text
    .toLocaleLowerCase("az")
    .replace(/[əıöüşçğ]|i̇/g, (ch) => AZ_MAP[ch] ?? ch)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
