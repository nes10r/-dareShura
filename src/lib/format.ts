const TZ = "Asia/Baku";

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("az", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("az", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));
}

/** "15 oktyabr 2026, 14:00" — Intl "az" lokalı tarix-vaxt arasına ingiliscə "at" qoyduğu üçün əl ilə birləşdirilir */
export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** Qısa tarix-vaxt: "15 okt · 14:00" (kartlar üçün) */
export function formatShortDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("az", { day: "numeric", month: "short", timeZone: TZ }).format(d);
  return `${day} · ${formatTime(iso)}`;
}

/** Vaxt aralığı: eyni gündürsə "15 oktyabr 2026, 14:00 – 17:00" */
export function formatDateTimeRange(start: string, end?: string | null) {
  if (!end) return formatDateTime(start);
  const sameDay = formatDate(start) === formatDate(end);
  if (!sameDay) return `${formatDateTime(start)} – ${formatDateTime(end)}`;
  return `${formatDateTime(start)} – ${formatTime(end)}`;
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

/** Profil şəklinin URL-i (versiyalı — şəkil dəyişəndə keş yenilənir); şəkil yoxdursa null */
export function avatarUrl(user: { id: string; avatarUpdatedAt?: string | null }) {
  return user.avatarUpdatedAt ? `/api/avatar/${user.id}?v=${Date.parse(user.avatarUpdatedAt)}` : null;
}
