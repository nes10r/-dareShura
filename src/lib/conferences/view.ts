import type { Conference, ConferenceFormat } from "../types";

const DAY = 864e5;

export type DeadlineState = "open" | "closed" | "unknown";
export type EventState = "upcoming" | "ongoing" | "past" | "unknown";

export function deadlineState(c: Pick<Conference, "deadline">, now = Date.now()): DeadlineState {
  if (!c.deadline) return "unknown";
  return Date.parse(c.deadline) > now ? "open" : "closed";
}

export function eventState(c: Pick<Conference, "startsAt" | "endsAt">, now = Date.now()): EventState {
  if (!c.startsAt) return "unknown";
  const start = Date.parse(c.startsAt);
  const end = c.endsAt ? Date.parse(c.endsAt) : start + DAY;
  if (now < start) return "upcoming";
  if (now <= end) return "ongoing";
  return "past";
}

/** Hələ keçirilməmiş (və ya tarixi bilinməyən, amma son 60 gündə elan olunmuş) konfranslar */
export function isCurrent(c: Conference, now = Date.now()) {
  const e = eventState(c, now);
  return e === "upcoming" || e === "ongoing" || (e === "unknown" && now - Date.parse(c.publishedAt) < 60 * DAY);
}

/** Müraciəti açıq olanlar əvvəl (son tarixi yaxın olan birinci), sonra keçirilmə tarixinə görə */
export function compareCurrent(a: Conference, b: Conference) {
  const now = Date.now();
  const ao = deadlineState(a, now) === "open";
  const bo = deadlineState(b, now) === "open";
  if (ao !== bo) return ao ? -1 : 1;
  if (ao && bo) return Date.parse(a.deadline!) - Date.parse(b.deadline!);
  return (a.startsAt ? Date.parse(a.startsAt) : Infinity) - (b.startsAt ? Date.parse(b.startsAt) : Infinity);
}

/** Son tarixə qədər qalan vaxtın təcililiyi */
export function urgency(target: string | null, now = Date.now()) {
  if (!target) return "none";
  const ms = Date.parse(target) - now;
  if (ms <= 0) return "past";
  if (ms < 3 * DAY) return "critical";
  if (ms < 7 * DAY) return "soon";
  return "normal";
}

export const FORMAT_STYLES: Record<ConferenceFormat, { chip: string; dot: string }> = {
  Əyani: { chip: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  Onlayn: { chip: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  Hibrid: { chip: "bg-violet-50 text-violet-800 ring-violet-200", dot: "bg-violet-500" },
};

export function feeLabel(c: Pick<Conference, "fee" | "feeNote">) {
  if (c.fee === "free") return "Ödənişsiz";
  if (c.fee === "paid") return c.feeNote ? `Ödənişli · ${c.feeNote}` : "Ödənişli";
  return null;
}
