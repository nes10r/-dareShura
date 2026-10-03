import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { StatsView } from "@/components/survey/StatsView";
import { requireUser } from "@/lib/auth";
import { getResponse, getSurvey, listResponsesBySurvey } from "@/lib/db/repo";
import { formatDate } from "@/lib/format";
import { getSurveyStats, getUserSurveys } from "@/lib/surveys/service";

export default async function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const survey = await getSurvey(id);
  if (!survey) notFound();

  const response = await getResponse(survey.id, user.id);
  const [view] = getUserSurveys([survey], response ? [response] : [], user);
  if (!view?.canViewResults) notFound();

  const responses = await listResponsesBySurvey(survey.id);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/surveys" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Sorğular
      </Link>
      <p className="mt-2 text-sm font-medium text-emerald-700">Sorğu nəticələri</p>
      <h1 className="mt-1 text-xl font-bold leading-snug sm:text-2xl">{survey.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {responses.length} iştirakçı
        {survey.resultsVisibleUntil && <> · Nəticələr {formatDate(survey.resultsVisibleUntil)} tarixinədək açıqdır</>}
      </p>
      <div className="mt-6">
        {/* Açıq mətnli cavablar məxfilik səbəbindən iştirakçılara göstərilmir */}
        <StatsView stats={getSurveyStats(survey, responses)} total={responses.length} />
      </div>
    </div>
  );
}
