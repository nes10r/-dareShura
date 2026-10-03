import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SurveyCard } from "@/components/dashboard/SurveyCard";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { listPublishedSurveys, listResponsesByUser } from "@/lib/db/repo";
import { formatDate } from "@/lib/format";
import { resolveModules } from "@/lib/modules/registry";
import { getUserSurveys } from "@/lib/surveys/service";

export const metadata: Metadata = { title: "Sorğular" };

export default async function SurveysPage() {
  const user = await requireUser();
  const [surveys, responses] = await Promise.all([listPublishedSurveys(), listResponsesByUser(user.id)]);
  const views = getUserSurveys(surveys, responses, user);
  // Göstəriləcək heç nə yoxdursa, modul bu istifadəçi üçün mövcud deyil — boş səhifə göstərmirik.
  if (views.length === 0) notFound();

  const { cards } = await resolveModules(user);
  const surveyCards = cards.filter((c) => c.kind === "survey");
  const answered = views.filter((v) => v.state === "answered");

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <h1 className="text-2xl font-bold tracking-tight">Sorğular</h1>
      <p className="mt-1 text-muted">Sizə ünvanlanan sorğular</p>

      {surveyCards.length > 0 && (
        <div className="mt-6 space-y-3">
          {surveyCards.map((c) => (c.kind === "survey" ? <SurveyCard key={c.key} data={c.data} /> : null))}
        </div>
      )}

      {answered.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Cavablandırdıqlarım</h2>
          <ul className="space-y-2">
            {answered.map((v) => (
              <li key={v.survey.id}>
                <Link
                  href={`/surveys/${v.survey.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:ring-brand-200"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon name="check" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{v.survey.title}</span>
                    <span className="text-xs text-muted">Göndərildi: {formatDate(v.response?.submittedAt)}</span>
                  </span>
                  <Icon name="chevron-right" className="size-5 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
