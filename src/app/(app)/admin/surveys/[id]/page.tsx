import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { StatusChip } from "@/components/admin/StatusChip";
import { SurveyEditor } from "@/components/admin/SurveyEditor";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";
import { getSurvey, listResponsesBySurvey, listUsers } from "@/lib/db/repo";
import { formatDateTime } from "@/lib/format";
import { describeAudience, estimateMinutes, getEffectiveStatus, resolveAudience } from "@/lib/surveys/service";
import { closeSurvey, duplicateSurvey, removeSurvey } from "../actions";

export default async function AdminSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ published?: string; saved?: string }>;
}) {
  await requirePermission("survey.manage");
  const { id } = await params;
  const { published, saved } = await searchParams;
  const survey = await getSurvey(id);
  if (!survey) notFound();

  const [users, responses] = await Promise.all([listUsers(), listResponsesBySurvey(id)]);
  const status = getEffectiveStatus(survey);
  const audience = resolveAudience(survey, users).length;

  const back = (
    <Link href="/admin/surveys" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
      <Icon name="chevron-left" className="size-4" /> Sorğular
    </Link>
  );
  const secondaryBtn = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-line hover:bg-slate-50";

  // Draft və şablonlar redaktə olunur
  if (status === "draft") {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
        {back}
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{survey.isTemplate ? "Şablonu redaktə et" : "Draftı redaktə et"}</h1>
          <StatusChip status={status} template={survey.isTemplate} />
        </div>
        {saved && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Yadda saxlanıldı.</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {survey.isTemplate ? (
            <Link href={`/admin/surveys/new?from=${survey.id}`} className={secondaryBtn}>
              <Icon name="plus" className="size-4" /> Bu şablondan sorğu yarat
            </Link>
          ) : (
            <form action={duplicateSurvey.bind(null, survey.id, true)}>
              <button type="submit" className={secondaryBtn}><Icon name="template" className="size-4" /> Şablon kimi saxla</button>
            </form>
          )}
          <form action={removeSurvey.bind(null, survey.id)}>
            <ConfirmSubmit message="Silinsin? Bu əməliyyat geri qaytarılmır." className={`${secondaryBtn} text-red-600`}>
              <Icon name="x" className="size-4" /> Sil
            </ConfirmSubmit>
          </form>
        </div>

        <div className="mt-6">
          <SurveyEditor
            id={survey.id}
            isTemplate={survey.isTemplate}
            initial={{
              title: survey.title,
              description: survey.description,
              startsAt: survey.startsAt,
              endsAt: survey.endsAt,
              audience: survey.audience,
              resultsVisibility: survey.resultsVisibility,
              resultsVisibleUntil: survey.resultsVisibleUntil,
              questions: survey.questions,
            }}
            people={users.map((u) => ({ role: u.role, faculty: u.faculty }))}
          />
        </div>
      </div>
    );
  }

  const rate = audience ? Math.round((responses.length / audience) * 100) : 0;
  const stats = [
    { label: "Auditoriya", value: audience },
    { label: "Cavab", value: responses.length },
    { label: "İştirak", value: `${rate}%` },
    { label: "Sual", value: survey.questions.length },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      {back}
      {published !== undefined && (
        <div className="animate-pop mt-2 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" /></span>
          <p className="text-sm text-emerald-900">
            <b>{status === "scheduled" ? "Sorğu planlaşdırıldı." : "Sorğu dərc olundu."}</b>{" "}
            {status === "scheduled" ? "Başlama vaxtı" : "İndi"} {published} istifadəçinin dashboard-unda görünəcək.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-3">
        <h1 className="text-xl font-bold leading-snug sm:text-2xl">{survey.title}</h1>
        <StatusChip status={status} />
      </div>
      {survey.description && <p className="mt-2 text-muted">{survey.description}</p>}

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <dl className="mt-4 divide-y divide-line rounded-2xl bg-white text-sm ring-1 ring-line">
        {[
          ["Auditoriya", describeAudience(survey)],
          ["Başlama", formatDateTime(survey.startsAt ?? survey.publishedAt)],
          ["Son tarix", formatDateTime(survey.endsAt)],
          ["Təxmini vaxt", `${estimateMinutes(survey)} dəqiqə`],
          ["Nəticələr", survey.resultsVisibility === "RESPONDENTS" ? `İştirakçılara açıq (${formatDateTime(survey.resultsVisibleUntil)} tarixinədək)` : "Yalnız administratorlar"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 p-4 sm:flex-row sm:justify-between">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium sm:text-right">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
        <Link href={`/admin/surveys/${survey.id}/analytics`} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800">
          <Icon name="chart" className="size-5" /> Analitika
        </Link>
        <form action={duplicateSurvey.bind(null, survey.id, false)} className="grid">
          <button type="submit" className={secondaryBtn}><Icon name="file" className="size-4" /> Kopyasını yarat</button>
        </form>
        <form action={duplicateSurvey.bind(null, survey.id, true)} className="grid">
          <button type="submit" className={secondaryBtn}><Icon name="template" className="size-4" /> Şablon kimi saxla</button>
        </form>
        {(status === "active" || status === "scheduled") && (
          <form action={closeSurvey.bind(null, survey.id)} className="grid">
            <ConfirmSubmit message="Sorğu bağlansın? İstifadəçilər artıq cavab verə bilməyəcək." className={`${secondaryBtn} text-red-600`}>
              <Icon name="lock" className="size-4" /> Sorğunu bağla
            </ConfirmSubmit>
          </form>
        )}
      </div>
    </div>
  );
}
