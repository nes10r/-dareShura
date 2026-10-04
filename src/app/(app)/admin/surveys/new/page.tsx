import type { Metadata } from "next";
import Link from "next/link";
import { SurveyEditor } from "@/components/admin/SurveyEditor";
import { Icon } from "@/components/Icon";
import { requirePermission } from "@/lib/auth";
import { getSurvey, listSurveys, listUsers } from "@/lib/db/repo";
import type { SurveyInput } from "../actions";

export const metadata: Metadata = { title: "Yeni sorğu" };

const EMPTY: SurveyInput = {
  title: "",
  description: "",
  startsAt: null,
  endsAt: null,
  audience: { all: true, roles: [], faculties: [], userIds: [] },
  resultsVisibility: "NONE",
  resultsVisibleUntil: null,
  questions: [],
  anonymous: false,
};

export default async function NewSurveyPage({ searchParams }: { searchParams: Promise<{ from?: string; template?: string }> }) {
  await requirePermission("survey.manage");
  const { from, template } = await searchParams;
  const [users, surveys] = await Promise.all([listUsers(), listSurveys()]);
  const source = from ? await getSurvey(from) : null;
  const templates = surveys.filter((s) => s.isTemplate);
  const asTemplate = template === "1";

  const initial: SurveyInput = source
    ? { ...EMPTY, title: source.title, description: source.description, audience: source.audience, questions: source.questions, anonymous: source.anonymous }
    : EMPTY;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/admin/surveys" className="inline-flex h-10 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" /> Sorğular
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{asTemplate ? "Yeni şablon" : "Yeni sorğu"}</h1>
      {source && <p className="mt-1 text-sm text-muted">Şablon əsasında: {source.title}</p>}

      {!source && !asTemplate && templates.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium text-muted">Şablondan başla</p>
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/admin/surveys/new?from=${t.id}`}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium ring-1 ring-line hover:ring-brand-200"
              >
                <Icon name="template" className="size-4 text-violet-600" /> {t.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <SurveyEditor
          key={from ?? "blank"}
          id={null}
          isTemplate={asTemplate}
          initial={initial}
          people={users.map((u) => ({ role: u.role, faculty: u.faculty }))}
        />
      </div>
    </div>
  );
}
