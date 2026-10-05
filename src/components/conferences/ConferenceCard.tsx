import Link from "next/link";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/format";
import { deadlineState, eventState, FORMAT_STYLES, feeLabel, urgency } from "@/lib/conferences/view";
import type { Conference } from "@/lib/types";
import { Countdown } from "./Countdown";

const TZ = "Asia/Baku";
const day = (iso: string) => new Intl.DateTimeFormat("az", { day: "numeric", timeZone: TZ }).format(new Date(iso));
const month = (iso: string) => new Intl.DateTimeFormat("az", { month: "short", timeZone: TZ }).format(new Date(iso)).replace(".", "");
const year = (iso: string) => new Intl.DateTimeFormat("az", { year: "numeric", timeZone: TZ }).format(new Date(iso));

/** Təqvim vərəqi formasında tarix: "15–16 / okt" */
export function DateBlock({ c, dark = false }: { c: Pick<Conference, "startsAt" | "endsAt">; dark?: boolean }) {
  const base = dark ? "bg-white/10 text-white ring-white/20" : "bg-white text-ink ring-line";
  if (!c.startsAt) {
    return (
      <div className={`grid size-16 shrink-0 place-items-center rounded-2xl text-center ring-1 ${base}`}>
        <Icon name="calendar" className="size-6 opacity-50" />
      </div>
    );
  }
  const sameMonth = !c.endsAt || month(c.startsAt) === month(c.endsAt);
  const days = c.endsAt && day(c.endsAt) !== day(c.startsAt) ? `${day(c.startsAt)}–${day(c.endsAt)}` : day(c.startsAt);
  return (
    <div className={`flex w-16 shrink-0 flex-col overflow-hidden rounded-2xl text-center ring-1 ${base}`}>
      <span className={`py-0.5 text-[11px] font-bold uppercase tracking-wider text-white ${dark ? "bg-white/20" : "bg-brand-700"}`}>
        {sameMonth ? month(c.startsAt) : `${month(c.startsAt)}–${month(c.endsAt!)}`}
      </span>
      <span className={`px-1 pt-1.5 font-bold leading-none tabular-nums ${days.length > 4 ? "text-base" : "text-2xl"}`}>{days}</span>
      <span className="pb-1.5 pt-1 text-[10px] opacity-60">{year(c.startsAt)}</span>
    </div>
  );
}

export function FormatChip({ format }: { format: Conference["format"] }) {
  if (!format) {
    return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Format göstərilməyib</span>;
  }
  const s = FORMAT_STYLES[format];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.chip}`}>
      <Icon name={format === "Onlayn" ? "video" : format === "Hibrid" ? "users" : "pin"} className="size-3.5" /> {format}
    </span>
  );
}

export function FeeChip({ c }: { c: Pick<Conference, "fee" | "feeNote"> }) {
  const label = feeLabel(c);
  if (!label) return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Ödəniş göstərilməyib</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        c.fee === "free" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"
      }`}
    >
      {label}
    </span>
  );
}

const URGENCY_STYLES = {
  critical: "bg-red-600 text-white",
  soon: "bg-amber-500 text-white",
  normal: "bg-brand-700 text-white",
  past: "bg-slate-100 text-slate-500",
  none: "bg-slate-100 text-slate-600",
} as const;

/** Kartın alt zolağı: son müraciət tarixi + canlı geri sayım */
function DeadlineBar({ c }: { c: Conference }) {
  const state = deadlineState(c);
  const ev = eventState(c);

  if (state === "unknown") {
    return (
      <div className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${URGENCY_STYLES.none}`}>
        <span className="flex items-center gap-2">
          <Icon name="clock" className="size-4 shrink-0" /> Son tarix göstərilməyib
        </span>
        {ev === "upcoming" && c.startsAt && (
          <span className="shrink-0 text-xs">
            Başlamağa: <b><Countdown target={c.startsAt} fallback={formatDate(c.startsAt)} /></b>
          </span>
        )}
      </div>
    );
  }

  const u = urgency(c.deadline);
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 ${URGENCY_STYLES[u]}`}>
      <span className="flex items-center gap-2 text-sm">
        <Icon name="clock" className="size-4 shrink-0" />
        {state === "open" ? "Son müraciət:" : "Müraciət bitib:"} <b>{formatDate(c.deadline)}</b>
      </span>
      {state === "open" && (
        <span className="text-sm font-bold">
          <Countdown target={c.deadline!} fallback="" /> <span className="font-normal opacity-80">qalıb</span>
        </span>
      )}
    </div>
  );
}

export function ConferenceCard({ c }: { c: Conference }) {
  const past = eventState(c) === "past";
  return (
    <Link
      href={`/konfranslar/${c.id}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-200 ${past ? "opacity-75" : ""}`}
    >
      <div className="flex flex-1 gap-4 p-4 sm:p-5">
        <DateBlock c={c} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-3 font-semibold leading-snug group-hover:text-brand-700">{c.title}</h3>
          {c.location && (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
              <Icon name="pin" className="mt-0.5 size-4 shrink-0" />
              <span className="line-clamp-2">{c.location}</span>
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <FormatChip format={c.format} />
            <FeeChip c={c} />
          </div>
        </div>
      </div>
      <DeadlineBar c={c} />
    </Link>
  );
}
