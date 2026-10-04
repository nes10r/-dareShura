import { Icon } from "@/components/Icon";
import { daysLeftLabel, formatDateTime, formatDateTimeRange } from "@/lib/format";
import type { IconName } from "@/lib/modules/types";
import type { NewsItem } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

/** Kateqoriyaya xas məlumatlar: iclas/tədbir vaxtı, məkan, linklər; elanın son tarixi. */
export function NewsInfoCard({ item }: { item: NewsItem }) {
  const m = item.meta;
  const rows: { icon: IconName; label: string; value: React.ReactNode }[] = [];

  if (m.startsAt) rows.push({ icon: "calendar", label: "Vaxt", value: formatDateTimeRange(m.startsAt, m.endsAt) });
  if (m.location) rows.push({ icon: "pin", label: "Məkan", value: m.location });
  if (m.format) rows.push({ icon: "users", label: "Format", value: m.format });
  if (m.deadline) {
    const ms = new Date(m.deadline).getTime() - Date.now();
    const left = ms > 0 ? daysLeftLabel(Math.floor(ms / DAY)) : "Müddəti bitib";
    rows.push({
      icon: "clock",
      label: "Son tarix",
      value: (
        <>
          {formatDateTime(m.deadline)}{" "}
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${ms > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{left}</span>
        </>
      ),
    });
  }
  if (m.contact) rows.push({ icon: "phone", label: "Əlaqə", value: m.contact });

  const upcoming = m.startsAt && new Date(m.endsAt ?? m.startsAt).getTime() > Date.now();
  const actions = [
    m.registrationUrl && upcoming ? { href: m.registrationUrl, label: "Qeydiyyatdan keç", icon: "arrow-right" as const, primary: true } : null,
    m.onlineUrl && upcoming ? { href: m.onlineUrl, label: "Onlayn qoşul", icon: "video" as const, primary: !m.registrationUrl } : null,
    m.startsAt && upcoming ? { href: `/xeberler/${item.slug}/ics`, label: "Təqvimə əlavə et", icon: "calendar" as const, primary: false } : null,
  ].filter((a): a is NonNullable<typeof a> => !!a);

  if (!rows.length && !actions.length) return null;

  return (
    <aside className="mt-8 rounded-2xl bg-surface p-5 ring-1 ring-line" aria-label={`${item.category} məlumatları`}>
      <dl className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700 ring-1 ring-line">
              <Icon name={r.icon} className="size-5" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs text-muted">{r.label}</dt>
              <dd className="font-medium leading-snug">{r.value}</dd>
            </div>
          </div>
        ))}
      </dl>
      {actions.length > 0 && (
        <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
          {actions.map((a) => (
            <a
              key={a.label}
              href={a.href}
              {...(a.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold transition ${
                a.primary ? "bg-brand-700 text-white hover:bg-brand-800" : "bg-white ring-1 ring-line hover:bg-slate-50"
              }`}
            >
              <Icon name={a.icon} className="size-5" /> {a.label}
            </a>
          ))}
        </div>
      )}
    </aside>
  );
}
