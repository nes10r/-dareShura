import { STATUS_LABELS } from "@/lib/surveys/service";
import type { EffectiveStatus } from "@/lib/types";

const STYLES: Record<EffectiveStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  scheduled: "bg-sky-50 text-sky-700 ring-sky-200",
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  closed: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export function StatusChip({ status, template = false }: { status: EffectiveStatus; template?: boolean }) {
  if (template) {
    return <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200">Şablon</span>;
  }
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}
