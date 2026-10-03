import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/admin/StatusChip";
import { Icon } from "@/components/Icon";
import { StatsView } from "@/components/survey/StatsView";
import { requirePermission } from "@/lib/auth";
import { getSurvey, listResponsesBySurvey, listUsers } from "@/lib/db/repo";
import { getEffectiveStatus, getSurveyStats, resolveAudience } from "@/lib/surveys/service";

export default async function SurveyAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("survey.manage");
  const { id } = await params;
  const survey = await getSurvey(id);
  if (!survey || survey.isTemplate) notFound();

  const [users, responses] = await Promise.all([listUsers(), listResponsesBySurvey(id)]);
  const audience = resolveAudience(survey, users);
  const respondedIds = new Set(responses.map((r) => r.userId));
  const rate = audience.length ? Math.round((responses.length / audience.length) * 100) : 0;

  // Fakültələr üzrə iştirak
  const byFaculty = [...new Set(audience.map((u) => u.faculty || "Göstərilməyib"))]
    .map((faculty) => {
      const members = audience.filter((u) => (u.faculty || "Göstərilməyib") === faculty);
      const done = members.filter((u) => respondedIds.has(u.id)).length;
      return { faculty, done, total: members.length };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href={`/admin/surveys/${survey.id}`} className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Sorğu
      </Link>
      <div className="mt-1 flex items-start justify-between gap-3">
        <h1 className="text-xl font-bold leading-snug sm:text-2xl">{survey.title}</h1>
        <StatusChip status={getEffectiveStatus(survey)} />
      </div>

      <section className="mt-5 rounded-2xl bg-white p-5 ring-1 ring-line">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted">İştirak</p>
            <p className="text-3xl font-bold tabular-nums">{rate}%</p>
          </div>
          <p className="text-sm text-muted">{responses.length} / {audience.length} istifadəçi</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${rate}%` }} />
        </div>
        {byFaculty.length > 1 && (
          <ul className="mt-5 space-y-2.5 text-sm">
            {byFaculty.map((f) => (
              <li key={f.faculty} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate">{f.faculty}</span>
                <span className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-40">
                  <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(f.done / f.total) * 100}%` }} />
                </span>
                <span className="w-10 text-right tabular-nums text-muted">{f.done}/{f.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Suallar üzrə nəticələr</h2>
      {responses.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-muted ring-1 ring-line">Hələ cavab yoxdur.</p>
      ) : (
        <StatsView stats={getSurveyStats(survey, responses)} total={responses.length} showTexts />
      )}
    </div>
  );
}
