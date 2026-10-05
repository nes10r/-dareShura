import Link from "next/link";
import { Countdown } from "@/components/conferences/Countdown";
import { DateBlock } from "@/components/conferences/ConferenceCard";
import { Icon } from "@/components/Icon";
import { urgency } from "@/lib/conferences/view";
import { formatDate } from "@/lib/format";
import type { ConferencesCardData } from "@/lib/modules/types";

const TONE = { critical: "text-red-600", soon: "text-amber-600", normal: "text-brand-700", past: "text-muted", none: "text-muted" } as const;

/** Dashboard: müraciəti açıq / yaxınlaşan konfranslar */
export function ConferencesCard({ data }: { data: ConferencesCardData }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="flex items-center gap-2 font-semibold">
          <Icon name="calendar" className="size-5 text-brand-700" /> Konfranslar
          {data.openCount > 0 && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{data.openCount} müraciət açıq</span>
          )}
        </p>
        <Link href="/konfranslar" className="text-sm font-semibold text-brand-700">
          Hamısı
        </Link>
      </div>
      <ul className="divide-y divide-line">
        {data.items.map((c) => (
          <li key={c.id}>
            <Link href={`/konfranslar/${c.id}`} className="flex gap-3 px-4 py-3 transition hover:bg-slate-50">
              <DateBlock c={c} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium leading-snug">{c.title}</span>
                <span className="mt-1 block truncate text-xs text-muted">
                  {[c.format, c.location].filter(Boolean).join(" · ") || "Ətraflı məlumat elanda"}
                </span>
                {c.deadline ? (
                  <span className={`mt-1 flex items-center gap-1 text-xs font-semibold ${TONE[urgency(c.deadline)]}`}>
                    <Icon name="clock" className="size-3.5" />
                    <Countdown target={c.deadline} fallback={`Son tarix: ${formatDate(c.deadline)}`} /> qalıb
                  </span>
                ) : (
                  <span className="mt-1 block text-xs text-muted">Son tarix göstərilməyib</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
