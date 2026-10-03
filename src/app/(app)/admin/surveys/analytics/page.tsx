import type { Metadata } from "next";
import Link from "next/link";
import { StatusChip } from "@/components/admin/StatusChip";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";
import { countResponsesBySurvey, listSurveys, listUsers } from "@/lib/db/repo";
import { getEffectiveStatus, resolveAudience } from "@/lib/surveys/service";

export const metadata: Metadata = { title: "Sorğu analitikası" };

export default async function SurveysAnalyticsPage() {
  await requirePermission("survey.manage");
  const [surveys, users, counts] = await Promise.all([listSurveys(), listUsers(), countResponsesBySurvey()]);

  const rows = surveys
    .filter((s) => !s.isTemplate)
    .map((s) => ({ s, status: getEffectiveStatus(s) }))
    .filter((r) => r.status === "active" || r.status === "closed")
    .map(({ s, status }) => {
      const audience = resolveAudience(s, users).length;
      const responses = counts.get(s.id) ?? 0;
      return { s, status, audience, responses, rate: audience ? Math.round((responses / audience) * 100) : 0 };
    });

  const totalResponses = rows.reduce((n, r) => n + r.responses, 0);
  const avgRate = rows.length ? Math.round(rows.reduce((n, r) => n + r.rate, 0) / rows.length) : 0;
  const kpis = [
    { label: "Aktiv sorğu", value: rows.filter((r) => r.status === "active").length },
    { label: "Ümumi cavab", value: totalResponses },
    { label: "Orta iştirak", value: `${avgRate}%` },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/admin/surveys" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Sorğular
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Analitika</h1>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <dt className="text-xs text-muted">{k.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{k.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Sorğular üzrə iştirak</h2>
      <ul className="space-y-3">
        {rows.map(({ s, status, audience, responses, rate }) => (
          <li key={s.id}>
            <Link href={`/admin/surveys/${s.id}/analytics`} className="block rounded-2xl bg-white p-4 ring-1 ring-line transition hover:ring-brand-200">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">{s.title}</p>
                <StatusChip status={status} />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${rate}%` }} />
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted">{responses}/{audience} · {rate}%</span>
              </div>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="rounded-2xl bg-white p-6 text-center text-muted ring-1 ring-line">Hələ dərc olunmuş sorğu yoxdur.</li>}
      </ul>
    </div>
  );
}
