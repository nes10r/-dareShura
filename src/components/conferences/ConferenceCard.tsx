import Link from "next/link";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/format";
import { deadlineState, eventState, FORMAT_STYLES, feeLabel, urgency } from "@/lib/conferences/view";
import type { Conference } from "@/lib/types";
import { Countdown } from "./Countdown";

const TZ = "Asia/Baku";
const day = (iso: string) => new Intl.DateTimeFormat("az", { day: "numeric", timeZone: TZ }).format(new Date(iso));
const month = (iso: string) => new Intl.DateTimeFormat("az", { month: "short", timeZone: TZ }).format(new Date(iso)).replace(".", "");
const shortDate = (iso: string) => `${day(iso)} ${month(iso)}`;
const year = (iso: string) => new Intl.DateTimeFormat("az", { year: "numeric", timeZone: TZ }).format(new Date(iso));

/**
 * Yığcam tarix nişanı (56×56): "15–16 / okt". İl yalnız cari ildən fərqlidirsə göstərilir.
 * `self-start` — flex sırasında kartın hündürlüyünə qədər uzanmasın.
 */
export function DateBlock({ c, past = false }: { c: Pick<Conference, "startsAt" | "endsAt">; past?: boolean }) {
  const tone = past ? "bg-slate-100 text-slate-500 ring-slate-200" : "bg-brand-50 text-brand-800 ring-brand-100";
  if (!c.startsAt) {
    return (
      <div className={`grid size-14 shrink-0 self-start place-items-center rounded-xl ring-1 ${tone}`} aria-label="Tarix göstərilməyib">
        <Icon name="calendar" className="size-6 opacity-60" />
      </div>
    );
  }
  const end = c.endsAt && day(c.endsAt) !== day(c.startsAt) ? c.endsAt : null;
  const crossMonth = end && month(end) !== month(c.startsAt);
  const days = end ? `${day(c.startsAt)}–${day(end)}` : day(c.startsAt);
  const y = year(c.startsAt);
  const monthLabel = crossMonth ? `${month(c.startsAt)}–${month(end!)}` : month(c.startsAt);
  return (
    <div
      className={`flex size-14 shrink-0 self-start flex-col items-center justify-center rounded-xl text-center ring-1 ${tone}`}
      aria-label={`${days} ${monthLabel} ${y}`}
    >
      <span className={`font-bold leading-none tabular-nums tracking-tight ${days.length > 3 ? "text-[15px]" : "text-xl"}`}>{days}</span>
      <span className="mt-1 text-[10px] font-semibold uppercase leading-none tracking-wide opacity-80">
        {monthLabel}
        {y !== year(new Date().toISOString()) && ` '${y.slice(2)}`}
      </span>
    </div>
  );
}

export function FormatChip({ format, hideUnknown = false }: { format: Conference["format"]; hideUnknown?: boolean }) {
  if (!format) {
    return hideUnknown ? null : (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Format göstərilməyib</span>
    );
  }
  const s = FORMAT_STYLES[format];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.chip}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} /> {format}
    </span>
  );
}

export function FeeChip({ c, hideUnknown = false }: { c: Pick<Conference, "fee" | "feeNote">; hideUnknown?: boolean }) {
  const label = feeLabel(c);
  if (!label) {
    return hideUnknown ? null : (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Ödəniş göstərilməyib</span>
    );
  }
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

const OPEN_STYLES = {
  critical: "bg-red-50 text-red-700 ring-red-200",
  soon: "bg-amber-50 text-amber-800 ring-amber-200",
  normal: "bg-brand-50 text-brand-800 ring-brand-100",
} as const;

/** Kartın altı: son müraciət tarixi. Açıqdırsa — rəngli blok və canlı geri sayım, yoxsa sakit bir sətir. */
function DeadlineBar({ c }: { c: Conference }) {
  const state = deadlineState(c);
  const ev = eventState(c);

  if (state === "open") {
    const u = urgency(c.deadline) as keyof typeof OPEN_STYLES;
    return (
      <div className={`mx-4 mb-4 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ring-1 sm:mx-5 sm:mb-5 ${OPEN_STYLES[u] ?? OPEN_STYLES.normal}`}>
        <span className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-wide opacity-75">Son müraciət</span>
          <span className="block text-sm font-semibold">{formatDate(c.deadline)}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[11px] font-medium uppercase tracking-wide opacity-75">Qalıb</span>
          <span className="block text-sm font-bold">
            <Countdown target={c.deadline!} fallback="—" />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted sm:px-5">
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon name="clock" className="size-3.5 shrink-0" />
        <span className="truncate">{state === "closed" ? `Müraciət bitib · ${shortDate(c.deadline!)}` : "Son tarix elanda yoxdur"}</span>
      </span>
      {ev === "upcoming" && c.startsAt && (
        <span className="shrink-0">
          <b className="font-semibold text-ink">
            <Countdown target={c.startsAt} variant="short" fallback={shortDate(c.startsAt)} />
          </b>{" "}
          sonra başlayır
        </span>
      )}
      {ev === "past" && <span className="shrink-0">Keçirilib</span>}
    </div>
  );
}

export function ConferenceCard({ c }: { c: Conference }) {
  const past = eventState(c) === "past";
  return (
    <Link
      href={`/konfranslar/${c.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-200"
    >
      <div className="flex-1 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <DateBlock c={c} past={past} />
          <h3 className={`line-clamp-3 font-semibold leading-snug group-hover:text-brand-700 ${past ? "text-slate-600" : ""}`}>{c.title}</h3>
        </div>
        {c.location && (
          <p className="mt-3 flex items-start gap-1.5 text-sm text-muted">
            <Icon name="pin" className="mt-0.5 size-4 shrink-0" />
            <span className="line-clamp-1">{c.location}</span>
          </p>
        )}
        {(c.format || c.fee) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <FormatChip format={c.format} hideUnknown />
            <FeeChip c={c} hideUnknown />
          </div>
        )}
      </div>
      <DeadlineBar c={c} />
    </Link>
  );
}
