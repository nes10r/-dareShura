import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StatusChip } from "@/components/admin/StatusChip";
import { SurveyEditor } from "@/components/admin/SurveyEditor";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";
import { getSurvey, listResponsesBySurvey, listUsers } from "@/lib/db/repo";
import { getEffectiveStatus } from "@/lib/surveys/service";

export const metadata: Metadata = { title: "Sorğunu redaktə et" };

/** Dərc olunmuş sorğunun redaktəsi (draft və şablonlar öz səhifəsində redaktə olunur). */
export default async function EditPublishedSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("survey.manage");
  const { id } = await params;
  const survey = await getSurvey(id);
  if (!survey) notFound();
  if (survey.status === "DRAFT") redirect(`/admin/surveys/${id}`);

  const [users, responses] = await Promise.all([listUsers(), listResponsesBySurvey(id)]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href={`/admin/surveys/${id}`} className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Sorğu
      </Link>
      <div className="mt-1 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Sorğunu redaktə et</h1>
        <StatusChip status={getEffectiveStatus(survey)} />
      </div>

      <div className="mt-6">
        <SurveyEditor
          id={survey.id}
          isTemplate={false}
          published
          responseCount={responses.length}
          initial={{
            title: survey.title,
            description: survey.description,
            startsAt: survey.startsAt,
            endsAt: survey.endsAt,
            audience: survey.audience,
            resultsVisibility: survey.resultsVisibility,
            resultsVisibleUntil: survey.resultsVisibleUntil,
            questions: survey.questions,
            anonymous: survey.anonymous,
          }}
          people={users.map((u) => ({ role: u.role, faculty: u.faculty }))}
        />
      </div>
    </div>
  );
}
