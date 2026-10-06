import Link from "next/link";
import { Countdown } from "@/components/conferences/Countdown";
import { Icon } from "@/components/Icon";
import { urgency } from "@/lib/conferences/view";
import { formatDate } from "@/lib/format";
import type { Grant } from "@/lib/types";

export const SOURCE_LABELS: Record<Grant["source"], string> = {
  aef: "Elm Fondu",
  unec: "UNEC",
  manual: "Digər fond",
};

const OPEN_STYLES = {
  critical: "bg-red-50 text-red-700 ring-red-200",
  soon: "bg-amber-50 text-amber-800 ring-amber-200",
  normal: "bg-emerald-50 text-emerald-800 ring-emerald-200",
} as const;

export function SourceChip({ source }: { source: Grant["source"] }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{SOURCE_LABELS[source]}</span>;
}

/** Son müraciət: açıqdırsa rəngli blok + geri sayım, yoxsa sakit sətir */
export function GrantDeadline({ deadline, compact = false }: { deadline: string | null; compact?: boolean }) {
  const open = deadline && Date.parse(deadline) > Date.now();
  if (open) {
    const u = urgency(deadline) as keyof typeof OPEN_STYLES;
    return (
      <div className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ring-1 ${OPEN_STYLES[u] ?? OPEN_STYLES.normal}`}>
        <span>
          <span className="block text-[11px] font-medium uppercase tracking-wide opacity-75">Son müraciət</span>
          <span className="block text-sm font-semibold">{formatDate(deadline)}</span>
        </span>
        <span className="text-right">
          <span className="block text-[11px] font-medium uppercase tracking-wide opacity-75">Qalıb</span>
          <span className="block text-sm font-bold">
            <Countdown target={deadline} variant={compact ? "short" : "inline"} fallback="—" />
          </span>
        </span>
      </div>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted">
      <Icon name="clock" className="size-3.5 shrink-0" />
      {deadline ? `Müraciət bitib · ${formatDate(deadline)}` : "Son tarix müsabiqə elanında (sənədlərə baxın)"}
    </p>
  );
}

export function GrantCard({ g, groupState }: { g: Grant; groupState?: "member" | "open" | null }) {
  return (
    <Link href={`/qrantlar/${g.id}`} className="group flex h-full flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-emerald-200 sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <SourceChip source={g.source} />
        {groupState === "member" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
            <Icon name="check" className="size-3" /> Qrupdasınız
          </span>
        )}
        {groupState === "open" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <Icon name="users" className="size-3" /> İşçi qrup formalaşır
          </span>
        )}
      </div>
      <h3 className="line-clamp-3 font-semibold leading-snug group-hover:text-emerald-700">{g.title}</h3>
      {(g.amount || g.fields.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {g.amount && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{g.amount}</span>}
          {g.fields.slice(0, 4).map((f) => (
            <span key={f} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
              {f}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto">
        <GrantDeadline deadline={g.deadline} compact />
      </div>
    </Link>
  );
}
