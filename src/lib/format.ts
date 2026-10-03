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

