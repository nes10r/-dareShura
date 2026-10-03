import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { SurveyRunner } from "@/components/survey/SurveyRunner";
import { requireUser } from "@/lib/auth";
import { getResponse, getSurvey } from "@/lib/db/repo";
import { formatDate, formatDateTime } from "@/lib/format";
import { estimateMinutes, getEffectiveStatus, getUserSurveys, isInAudience } from "@/lib/surveys/service";
import type { AnswerValue } from "@/lib/types";

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const survey = await getSurvey(id);

  // Auditoriyada olmayan və ya hələ dərc olunmamış sorğunun mövcudluğu belə göstərilmir
  if (!survey || survey.isTemplate || !isInAudience(survey, user)) notFound();
  const status = getEffectiveStatus(survey);
  if (status === "draft" || status === "scheduled") notFound();

  const response = await getResponse(survey.id, user.id);

  if (!response) {
    if (status !== "active") notFound();
    return (
      <SurveyRunner
        userId={user.id}
        survey={{ id: survey.id, title: survey.title, description: survey.description, questions: survey.questions }}
        minutes={estimateMinutes(survey)}
        deadline={survey.endsAt ? formatDate(survey.endsAt) : null}
      />
    );
  }

  const [view] = getUserSurveys([survey], [response], user);
  const show = (v: AnswerValue | undefined) => (v === undefined || v === "" ? "—" : Array.isArray(v) ? v.join(", ") : String(v));

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/surveys" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Sorğular
      </Link>
      <div className="mt-2 flex items-center gap-4 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <Icon name="check" />
        </span>
        <div>
          <p className="font-semibold text-emerald-900">Cavabınız qeydə alınıb</p>
          <p className="text-sm text-emerald-800/80">{formatDateTime(response.submittedAt)}</p>
        </div>
      </div>

      <h1 className="mt-6 text-xl font-bold leading-snug">{survey.title}</h1>

      {view?.canViewResults && (
        <Link
          href={`/surveys/${survey.id}/results`}
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800"
        >
          <Icon name="chart" className="size-5" /> Nəticələrə bax
        </Link>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">Sizin cavablarınız</h2>
      <ol className="mt-3 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
        {survey.questions.map((q, i) => (
          <li key={q.id} className="p-4">
            <p className="text-sm text-muted">{i + 1}. {q.title}</p>
            <p className="mt-1 font-medium">{show(response.answers[q.id])}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
